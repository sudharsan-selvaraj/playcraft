import { declare } from "@babel/helper-plugin-utils";
import * as t from "@babel/types";

export const transformer = declare((api) => {
  api.assertVersion(7);

  const asyncFunctionNames = new Set();

  function shouldMakeAsync(path: any) {
    return true;
  }

  function isAsyncSafe(path: any) {
    return !path.node.generator && path.node.body && Array.isArray(path.node.body.body);
  }

  function isInAsyncContext(path: any): boolean {
    let current = path;
    while (current) {
      if (
        (current.isFunctionDeclaration() ||
          current.isFunctionExpression() ||
          current.isArrowFunctionExpression() ||
          current.isClassMethod() ||
          current.isObjectMethod()) &&
        current.node.async
      ) {
        return true;
      }
      current = current.parentPath;
    }
    return false;
  }

  function injectReportLinesInBody(body: t.Statement[], isAsync: boolean = true) {
    const newBody = [];

    for (const stmt of body) {
      if (stmt.loc && !t.isFunctionDeclaration(stmt)) {
        const line = stmt.loc.start.line;

        const reportCall = t.callExpression(t.identifier("reportLine"), [t.numericLiteral(line)]);
        const report = t.expressionStatement(isAsync ? t.awaitExpression(reportCall) : reportCall);

        newBody.push(report);
      }
      newBody.push(stmt);
    }

    return newBody;
  }

  function isAsyncIIFE(stmt: t.Statement): boolean {
    if (!t.isExpressionStatement(stmt) || !t.isCallExpression(stmt.expression)) {
      return false;
    }

    const callee = stmt.expression.callee;

    return (t.isFunctionExpression(callee) || t.isArrowFunctionExpression(callee)) && callee.async;
  }

  return {
    name: "report-line-everywhere",
    visitor: {
      FunctionDeclaration(path) {
        if (!isAsyncSafe(path)) return;

        // Track already-async functions
        if (path.node.async && path.node.id) {
          asyncFunctionNames.add(path.node.id.name);
        }

        // Only make non-async functions async if they should be
        if (!path.node.async && shouldMakeAsync(path)) {
          path.node.async = true;
          if (path.node.id) asyncFunctionNames.add(path.node.id.name);
        }

        // Inject line reporting for all functions (both async and non-async)
        path.node.body.body = injectReportLinesInBody(path.node.body.body, path.node.async);
      },

      FunctionExpression(path) {
        if (!isAsyncSafe(path)) return;

        // Only make non-async functions async if they should be
        if (!path.node.async && shouldMakeAsync(path)) {
          path.node.async = true;
        }

        path.node.body.body = injectReportLinesInBody(path.node.body.body, path.node.async);
      },

      ArrowFunctionExpression(path) {
        if (!path.node.body || !t.isBlockStatement(path.node.body)) return;
        if (path.node.generator) return;

        // Only make non-async arrow functions async if they should be
        if (!path.node.async && shouldMakeAsync(path)) {
          path.node.async = true;
        }

        const blockBody = path.node.body as t.BlockStatement;
        blockBody.body = injectReportLinesInBody(blockBody.body, path.node.async);
      },

      ClassMethod(path) {
        const kind = path.node.kind;
        if (path.node.generator || kind === "constructor" || kind === "get" || kind === "set")
          return;

        // Track already-async methods
        if (path.node.async && t.isIdentifier(path.node.key)) {
          asyncFunctionNames.add(path.node.key.name);
        }

        // Only make non-async methods async if they should be
        if (!path.node.async && shouldMakeAsync(path)) {
          path.node.async = true;
          if (t.isIdentifier(path.node.key)) {
            asyncFunctionNames.add(path.node.key.name);
          }
        }

        path.node.body.body = injectReportLinesInBody(path.node.body.body, path.node.async);
      },

      ObjectMethod(path) {
        const kind = path.node.kind;
        if (path.node.generator || kind === "get" || kind === "set") return;

        // Track already-async object methods
        if (path.node.async && t.isIdentifier(path.node.key)) {
          asyncFunctionNames.add(path.node.key.name);
        }

        // Only make non-async methods async if they should be
        if (!path.node.async && shouldMakeAsync(path)) {
          path.node.async = true;
          if (t.isIdentifier(path.node.key)) {
            asyncFunctionNames.add(path.node.key.name);
          }
        }

        path.node.body.body = injectReportLinesInBody(path.node.body.body, path.node.async);
      },

      BlockStatement(path) {
        if (
          path.parent.type === "FunctionDeclaration" ||
          path.parent.type === "FunctionExpression" ||
          path.parent.type === "ArrowFunctionExpression" ||
          path.parent.type === "ClassMethod" ||
          path.parent.type === "ObjectMethod"
        ) {
          return;
        }

        const inAsync = isInAsyncContext(path);
        path.node.body = injectReportLinesInBody(path.node.body, inAsync);
      },

      CallExpression(path) {
        if (path.parentPath.isAwaitExpression() || path.parentPath.isYieldExpression()) return;

        const callee = path.node.callee;
        let calledName = null;

        if (t.isIdentifier(callee)) {
          calledName = callee.name;
        } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          calledName = callee.property.name;
        }

        if (calledName && asyncFunctionNames.has(calledName)) {
          path.replaceWith(t.awaitExpression(t.cloneNode(path.node)));
        }
      },

      Program: {
        exit(path) {
          const hasTopLevelAsyncIIFE =
            path.node.body.length === 1 && isAsyncIIFE(path.node.body[0]);

          if (!hasTopLevelAsyncIIFE) {
            const blockStatement = t.blockStatement(path.node.body);
            const asyncFunc = t.arrowFunctionExpression([], blockStatement, true);
            const iife = t.expressionStatement(t.callExpression(asyncFunc, []));

            // Inject line reporting into the block statement
            blockStatement.body = injectReportLinesInBody(blockStatement.body, true);

            path.node.body = [iife];
          }
        },
      },
    },
  };
});

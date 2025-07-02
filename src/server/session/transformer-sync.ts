import { declare } from "@babel/helper-plugin-utils";
import * as t from "@babel/types";

export const transformer = declare((api) => {
  api.assertVersion(7);

  function createReportNode(line: number) {
    return t.expressionStatement(
      t.callExpression(t.identifier("reportLine"), [t.numericLiteral(line)])
    );
  }

  function shouldInstrument(path: any) {
    const { node } = path;
    if (!node || !node.loc) return false;

    // Skip declaration and already-instrumented calls
    if (
      t.isFunctionDeclaration(node) ||
      t.isClassDeclaration(node) ||
      t.isImportDeclaration(node) ||
      t.isExportDeclaration(node)
    )
      return false;

    if (
      t.isExpressionStatement(node) &&
      t.isCallExpression(node.expression) &&
      t.isIdentifier(node.expression.callee, { name: "reportLine" })
    )
      return false;

    return true;
  }

  function instrumentStatements(path: any) {
    if (shouldInstrument(path)) {
      const line = path.node.loc.start.line;
      const reportNode = createReportNode(line);

      // Ensure we only insert inside a block
      const parent = path.parentPath;
      if (t.isBlockStatement(parent.node) || t.isProgram(parent.node)) {
        path.insertBefore(reportNode);
      }
    }
  }

  function isIIFE(programPath: any): boolean {
    const body = programPath.node.body;
    return (
      body.length === 1 &&
      t.isExpressionStatement(body[0]) &&
      t.isCallExpression(body[0].expression) &&
      (t.isFunctionExpression(body[0].expression.callee) ||
        t.isArrowFunctionExpression(body[0].expression.callee))
    );
  }

  return {
    name: "deep-report-line-tracker-with-iife",
    visitor: {
      Program(path) {
        const wrapped = isIIFE(path);

        if (!wrapped) {
          const asyncArrowFunc = t.arrowFunctionExpression(
            [],
            t.blockStatement(path.node.body),
            true // async
          );
          const callExpr = t.callExpression(t.parenthesizedExpression(asyncArrowFunc), []);
          path.node.body = [t.expressionStatement(callExpr)];
        }

        // Instrument all statements, with special handling for IIFE
        path.traverse({
          Statement(p) {
            // If this is an existing IIFE call expression, don't instrument it
            // but DO traverse into its function body
            if (wrapped && p.isExpressionStatement() && t.isCallExpression(p.node.expression)) {
              const callExpr = p.node.expression;
              const callee = callExpr.callee;

              if (t.isFunctionExpression(callee) || t.isArrowFunctionExpression(callee)) {
                // Traverse into the IIFE function body to instrument its statements
                if (t.isBlockStatement(callee.body)) {
                  // Get the function body and traverse its statements
                  const functionBody = callee.body;
                  const statements = functionBody.body;

                  // Process each statement in the function body
                  for (let i = 0; i < statements.length; i++) {
                    const stmt = statements[i];

                    // Skip certain types of statements
                    if (
                      t.isFunctionDeclaration(stmt) ||
                      t.isClassDeclaration(stmt) ||
                      t.isImportDeclaration(stmt) ||
                      t.isExportDeclaration(stmt) ||
                      !stmt.loc
                    ) {
                      continue;
                    }

                    // Skip if already a reportLine call
                    if (
                      t.isExpressionStatement(stmt) &&
                      t.isCallExpression(stmt.expression) &&
                      t.isIdentifier(stmt.expression.callee, { name: "reportLine" })
                    ) {
                      continue;
                    }

                    // Add reportLine before this statement
                    const line = stmt.loc.start.line;
                    const reportCall = createReportNode(line);
                    statements.splice(i, 0, reportCall);
                    i++; // Skip the inserted reportLine call
                  }
                }
              }
              return; // Skip instrumenting the IIFE call itself
            }

            // For all other statements, instrument normally
            instrumentStatements(p);
          },
        });
      },
    },
  };
});

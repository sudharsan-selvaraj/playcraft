(function () {
  if (window.self === window.top) {
    return;
  }

  function postMessageToParent(data) {
    window.parent.postMessage({ ...data, from: "playcraft" }, "*");
  }

  // Accept win (window object) and el
  function getPlaywrightLocator(win, el) {
    const selector = win.InjectedScript.generateSelector(el, {}).selector;
    return win.InjectedScript.utils.asLocator("javascript", selector);
  }

  // Accept win (window object) and el
  function highlightElement(win, el) {
    const selector = win.InjectedScript.generateSelector(el, {}).selector;
    win.InjectedScript.highlight(win.InjectedScript.parseSelector(selector));
  }

  // Recursively find the deepest element at (x, y) across frames, returning the window and element
  function deepElementFromPoint(win, e) {
    let doc = win.document;
    // let el = doc.elementFromPoint(x, y);
    let el = doc.elementFromPoint(e.clientX, e.clientY);
    if (e.composedPath()) {
      el = e.composedPath()[0];
    }
    while (el && (el.tagName === "IFRAME" || el.tagName === "FRAME")) {
      try {
        const rect = el.getBoundingClientRect();
        const frameX = x - rect.left;
        const frameY = y - rect.top;
        win = el.contentWindow;
        doc = win.document;
        el = doc.elementFromPoint(frameX, frameY);
      } catch (e) {
        break; // Cross-origin or inaccessible
      }
    }
    return { win, el };
  }

  function highlightElementAtPoint(e) {
    if (!e.target.ownerDocument) {
      return;
    }
    const { win, el } = deepElementFromPoint(e.target.ownerDocument.defaultView, e);
    if (!el || el.tagName === "IFRAME" || el.tagName === "FRAME") {
      return;
    }
    if (win.InjectedScript) {
      highlightElement(win, el);
    }
  }

  function getChainedLocator(element) {
    let locatorChain = "";
    let currentElement = element;
    let currentWindow = element.ownerDocument.defaultView;

    // Walk up through frames
    while (currentWindow.frameElement) {
      const parentWindow = currentWindow.parent;
      const frameEl = currentWindow.frameElement;
      // Ignore frame if its name is 'aut-frame'
      if (frameEl && frameEl.getAttribute && frameEl.getAttribute("name") === "aut-frame") {
        // currentWindow = parentWindow;
        break;
      }
      const frameLocator = getPlaywrightLocator(parentWindow, frameEl);
      const elementLocator = locatorChain
        ? locatorChain
        : getPlaywrightLocator(currentWindow, currentElement);
      locatorChain = `${frameLocator}.contentFrame().${elementLocator}`;
      currentElement = frameEl;
      currentWindow = parentWindow;
    }

    // If not inside any frame, just return the locator for the element
    if (!locatorChain) {
      return getPlaywrightLocator(currentWindow, currentElement);
    }
    return locatorChain;
  }

  function forwardLocatorToParent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const path = e.composedPath();
    const el = path && path.length > 0 ? path[0] : null;
    if (!el) return;
    const locator = getChainedLocator(el);
    postMessageToParent({
      action: "locator",
      locator,
    });
  }

  function notifyParentOnUrlChange() {
    const notify = () =>
      postMessageToParent({ action: "navigation", url: window.location.href }, "*");

    // For back/forward navigation
    window.addEventListener("popstate", notify);
    window.addEventListener("hashchange", notify);

    // Monkey patch pushState/replaceState
    const patchHistory = (fnName) => {
      const orig = history[fnName];
      history[fnName] = function (...args) {
        const result = orig.apply(this, args);
        notify();
        return result;
      };
    };

    patchHistory("pushState");
    patchHistory("replaceState");
  }

  function onMoseLeaveDocument(e) {
    if (!e.target?.ownerDocument) {
      return;
    }
    hideHighlightRecursive(e.target?.ownerDocument.defaultView);
  }

  // Recursively add/remove listeners to all frames and iframes
  function addLocatorListeners(doc) {
    doc.addEventListener("mousemove", highlightElementAtPoint, true);
    doc.addEventListener("mouseleave", onMoseLeaveDocument, true);
    doc.addEventListener("click", forwardLocatorToParent, true);
    Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
      try {
        if (frame.contentDocument) {
          addLocatorListeners(frame.contentDocument);
        }
      } catch (e) {}
    });
  }

  function removeLocatorListeners(doc) {
    doc.removeEventListener("mousemove", highlightElementAtPoint, true);
    doc.removeEventListener("mouseleave", onMoseLeaveDocument, true);
    doc.removeEventListener("click", forwardLocatorToParent, true);
    Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
      try {
        if (frame.contentDocument) {
          removeLocatorListeners(frame.contentDocument);
        }
      } catch (e) {}
    });
  }

  // Recursively hide highlights in all frames/iframes and remove all x-pw-tooltip elements inside x-pw-glass shadow roots
  function hideHighlightRecursive(win) {
    try {
      if (win && win.InjectedScript) {
        win.InjectedScript.hideHighlight();
      }
    } catch (e) {}
    const frames = win.document ? win.document.querySelectorAll("iframe, frame") : [];
    for (let i = 0; i < frames.length; ++i) {
      try {
        if (frames[i].contentWindow) {
          hideHighlightRecursive(frames[i].contentWindow);
        }
      } catch (e) {}
    }
  }

  // Observe for dynamically added/removed iframes/frames
  let mutationObserver = null;
  function observeIframes(doc) {
    if (mutationObserver) mutationObserver.disconnect();
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes &&
          Array.from(mutation.addedNodes).forEach((node) => {
            if (node.tagName === "IFRAME" || node.tagName === "FRAME") {
              try {
                if (node.contentDocument) {
                  addLocatorListeners(node.contentDocument);
                  observeIframes(node.contentDocument);
                }
              } catch (e) {}
            }
          });
        mutation.removedNodes &&
          Array.from(mutation.removedNodes).forEach((node) => {
            if (node.tagName === "IFRAME" || node.tagName === "FRAME") {
              try {
                if (node.contentDocument) {
                  removeLocatorListeners(node.contentDocument);
                }
              } catch (e) {}
            }
          });
      }
    });
    mutationObserver.observe(doc.body, { childList: true, subtree: true });
  }

  window.addEventListener("DOMContentLoaded", function () {
    notifyParentOnUrlChange();
    postMessageToParent({ action: "frame-loaded", url: window.location.href });
    window.addEventListener("message", function (e) {
      if (e.data.action === "enable-locator") {
        addLocatorListeners(document);
        observeIframes(document);
      } else if (e.data.action === "disable-locator") {
        hideHighlightRecursive(window);
        removeLocatorListeners(document);
        if (mutationObserver) mutationObserver.disconnect();
      } else if (e.data.action === "clear-highlights") {
        hideHighlightRecursive(window);
      }
    });
  });
})();

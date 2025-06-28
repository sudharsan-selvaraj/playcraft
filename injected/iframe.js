(function () {
  if (window.self === window.top) {
    return;
  }

  function postMessageToParent(data) {
    window.parent.postMessage({ ...data, from: "playcraft" }, "*");
  }

  function getPlaywrightLocator(el) {
    const selector = window.InjectedScript.generateSelector(el, {}).selector;
    return window.InjectedScript.utils.asLocator("javascript", selector);
  }

  function highlightElement(el) {
    const selector = window.InjectedScript.generateSelector(el, {}).selector;
    window.InjectedScript.highlight(window.InjectedScript.parseSelector(selector));
  }

  function highlightElementAtPoint(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (window.InjectedScript) {
      highlightElement(el);
    }
  }

  function forwardLocatorToParent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const locator = getPlaywrightLocator(el);
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

  window.addEventListener("DOMContentLoaded", function () {
    notifyParentOnUrlChange();
    postMessageToParent({ action: "frame-loaded", url: window.location.href });
    window.addEventListener("message", function (e) {
      if (e.data.action === "enable-locator") {
        document.addEventListener("mousemove", highlightElementAtPoint, true);
        document.addEventListener("click", forwardLocatorToParent, true);
      } else if (e.data.action === "disable-locator") {
        window.InjectedScript.hideHighlight();
        document.removeEventListener("mousemove", highlightElementAtPoint, true);
        document.removeEventListener("click", forwardLocatorToParent, true);
      }
    });
  });
})();

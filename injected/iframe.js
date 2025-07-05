(function () {
  if (window.self === window.top) {
    return;
  }

  /* Fake method to avoid reportLine errors inside evaluate callbacks */
  window.reportLine = () => {};

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
    let el = doc.elementFromPoint(e.clientX, e.clientY);
    if (e.composedPath()) {
      el = e.composedPath()[0];
    }
    while (el && (el.tagName === "IFRAME" || el.tagName === "FRAME")) {
      try {
        const rect = el.getBoundingClientRect();
        const frameX = e.clientX - rect.left;
        const frameY = e.clientY - rect.top;
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

  // Playwright Recorder Class
  class PlaywrightRecorder {
    constructor() {
      this.isRecording = false;
      this.recordingStartTime = null;
      this.focusedElements = new Map(); // Track focused elements and their initial values
      this.lastRecordedValues = new Map(); // Track last recorded value for each element
      this.initialUrl = null; // Track the initial URL when recording starts
      this.clickTimeout = null; // For debouncing single clicks vs double clicks
      this.lastClickElement = null; // Track the last clicked element
      this.lastClickTimestamp = null; // Track the timestamp of the last click

      // Bind event handlers to maintain 'this' context
      this.handleClick = this.handleClick.bind(this);
      this.handleFocus = this.handleFocus.bind(this);
      this.handleBlur = this.handleBlur.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleChange = this.handleChange.bind(this);
    }

    // Helper method to flush any pending input changes before other actions
    flushPendingInputChanges(excludeElement = null) {
      // Process all currently focused elements to record their changes
      for (const [element, initialValue] of this.focusedElements) {
        // Skip the element we're about to focus on
        if (element === excludeElement) continue;

        const currentValue = element.value || "";
        const lastRecordedValue = this.lastRecordedValues.get(element) || "";

        // Only record if the value has changed from initial focus value and is different from last recorded
        if (currentValue !== initialValue && currentValue !== lastRecordedValue) {
          const code = this.generatePlaywrightCode("fill", element, currentValue);
          const description = `fill input with "${currentValue}"`;
          this.sendRecordingStep(code, description);

          // Update the last recorded value
          this.lastRecordedValues.set(element, currentValue);
        }
      }

      // Only clear elements that are not excluded
      if (excludeElement) {
        // Remove all elements except the excluded one
        for (const [element] of this.focusedElements) {
          if (element !== excludeElement) {
            this.focusedElements.delete(element);
          }
        }
      } else {
        // Clear all focused elements
        this.focusedElements.clear();
      }
    }

    generatePlaywrightCode(action, element, value = null, options = {}) {
      const locator = getChainedLocator(element);
      const baseLocator = `page.${locator}`;

      switch (action) {
        case "click":
          return `await ${baseLocator}.click();`;
        case "fill":
          return `await ${baseLocator}.fill('${value}');`;
        case "type":
          return `await ${baseLocator}.type('${value}');`;
        case "press":
          return `await ${baseLocator}.press('${value}');`;
        case "check":
          return `await ${baseLocator}.check();`;
        case "uncheck":
          return `await ${baseLocator}.uncheck();`;
        case "select":
          return `await ${baseLocator}.selectOption('${value}');`;
        case "hover":
          return `await ${baseLocator}.hover();`;
        case "rightClick":
          return `await ${baseLocator}.click({ button: 'right' });`;
        case "doubleClick":
          return `await ${baseLocator}.dblclick();`;
        case "focus":
          return `await ${baseLocator}.focus();`;
        case "blur":
          return `await ${baseLocator}.blur();`;
        default:
          return `// Unknown action: ${action}`;
      }
    }

    sendRecordingStep(code, description = "") {
      if (!this.isRecording) return;

      postMessageToParent({
        action: "recording-step",
        code: code,
        description: description,
        timestamp: Date.now() - this.recordingStartTime,
      });
    }

    handleClick(e) {
      if (!this.isRecording) return;

      const element = e.target;
      if (!element || element.tagName === "IFRAME" || element.tagName === "FRAME") return;

      // Flush any pending input changes before processing click, but exclude the current element
      this.flushPendingInputChanges(element);

      // Skip click events for select elements as they're handled in handleChange
      if (element.tagName === "SELECT") {
        return;
      }

      // Record click events for input elements (except for text inputs where we only want focus)
      // We'll record clicks for buttons, checkboxes, radios, but not for text inputs
      const isTextInput =
        element.tagName === "INPUT" &&
        (element.type === "text" ||
          element.type === "email" ||
          element.type === "password" ||
          element.type === "search" ||
          element.type === "url" ||
          element.type === "tel" ||
          element.type === "number" ||
          !element.type ||
          element.type === "");

      if (isTextInput || element.tagName === "TEXTAREA") {
        // For text inputs and textareas, always record the click
        // This ensures proper test generation for focusing inputs
        const code = this.generatePlaywrightCode("click", element);
        const description = `click on ${element.tagName.toLowerCase()}${
          element.id ? "#" + element.id : ""
        }`;
        this.sendRecordingStep(code, description);
        return;
      }

      // Handle double-click detection
      if (e.detail === 2) {
        // This is a double-click, clear any pending single click
        if (this.clickTimeout) {
          clearTimeout(this.clickTimeout);
          this.clickTimeout = null;
        }

        // Record double-click immediately
        let action = "doubleClick";
        if (e.button === 2) action = "rightClick"; // Right double-click should still be rightClick

        const code = this.generatePlaywrightCode(action, element);
        const description = `${action} on ${element.tagName.toLowerCase()}${
          element.id ? "#" + element.id : ""
        }`;
        this.sendRecordingStep(code, description);
        return;
      }

      // Handle single click with debounce to avoid conflicts with double-click
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
      }

      this.clickTimeout = setTimeout(() => {
        // Determine click type
        let action = "click";
        if (e.button === 2) action = "rightClick";

        // Handle form elements (only for left clicks)
        if (e.button === 0) {
          // Left click only
          if (element.type === "checkbox") {
            action = element.checked ? "check" : "uncheck";
          } else if (element.type === "radio") {
            action = "check"; // Radio buttons are always checked when clicked
          }
        }

        const code = this.generatePlaywrightCode(action, element);
        const description = `${action} on ${element.tagName.toLowerCase()}${
          element.id ? "#" + element.id : ""
        }`;
        this.sendRecordingStep(code, description);

        this.clickTimeout = null;
      }, 300); // 300ms debounce to detect double-clicks
    }

    handleFocus(e) {
      if (!this.isRecording) return;

      const element = e.target;
      if (!element) return;

      // Only track focus for input elements that can contain text
      if (
        element.tagName === "INPUT" &&
        element.type !== "checkbox" &&
        element.type !== "radio" &&
        element.type !== "button" &&
        element.type !== "submit"
      ) {
        this.focusedElements.set(element, element.value || "");
      } else if (element.tagName === "TEXTAREA") {
        this.focusedElements.set(element, element.value || "");
      }
    }

    handleBlur(e) {
      if (!this.isRecording) return;

      const element = e.target;
      if (!element) return;

      // Check if this element was being tracked
      if (this.focusedElements.has(element)) {
        const initialValue = this.focusedElements.get(element);
        const currentValue = element.value || "";
        const lastRecordedValue = this.lastRecordedValues.get(element) || "";

        // Only record if the value has changed from initial focus value and is different from last recorded
        if (currentValue !== initialValue && currentValue !== lastRecordedValue) {
          const code = this.generatePlaywrightCode("fill", element, currentValue);
          const description = `fill input with "${currentValue}"`;
          this.sendRecordingStep(code, description);

          // Update the last recorded value
          this.lastRecordedValues.set(element, currentValue);
        }

        // Remove from focused elements
        this.focusedElements.delete(element);
      }
    }

    handleKeyDown(e) {
      if (!this.isRecording) return;

      const element = e.target;
      if (!element) return;

      // Special handling for Enter key in input fields
      if (e.key === "Enter" && this.focusedElements.has(element)) {
        // First, handle the input value change (like blur would do)
        const initialValue = this.focusedElements.get(element);
        const currentValue = element.value || "";
        const lastRecordedValue = this.lastRecordedValues.get(element) || "";

        // Record fill event if value changed
        if (currentValue !== initialValue && currentValue !== lastRecordedValue) {
          const fillCode = this.generatePlaywrightCode("fill", element, currentValue);
          const fillDescription = `fill input with "${currentValue}"`;
          this.sendRecordingStep(fillCode, fillDescription);

          // Update the last recorded value
          this.lastRecordedValues.set(element, currentValue);
        }

        // Then record the Enter key press
        const pressCode = this.generatePlaywrightCode("press", element, "Enter");
        const pressDescription = `press Enter`;
        this.sendRecordingStep(pressCode, pressDescription);

        // Remove from focused elements since Enter typically submits/completes the input
        this.focusedElements.delete(element);
        return;
      }

      // For other special keys, flush pending changes first
      const specialKeys = ["Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (specialKeys.includes(e.key)) {
        // Flush any pending input changes before processing the key press
        this.flushPendingInputChanges();

        const code = this.generatePlaywrightCode("press", element, e.key);
        const description = `press ${e.key}`;
        this.sendRecordingStep(code, description);
      }
    }

    handleChange(e) {
      if (!this.isRecording) return;

      // Flush any pending input changes before processing change event
      this.flushPendingInputChanges();

      const element = e.target;
      if (!element) return;

      if (element.tagName === "SELECT") {
        const selectedOption = element.options[element.selectedIndex];
        const value = selectedOption ? selectedOption.value : "";
        const code = this.generatePlaywrightCode("select", element, value);
        const description = `select option "${selectedOption?.text || value}"`;
        this.sendRecordingStep(code, description);
      }
    }

    recordNavigation(url) {
      if (!this.isRecording) return;

      // Flush any pending input changes before navigation
      this.flushPendingInputChanges();

      // Only record navigation if this is the initial URL when recording starts
      if (this.initialUrl === null) {
        this.initialUrl = url;
        const code = `await page.goto('${url}');`;
        const description = `navigate to ${url}`;
        this.sendRecordingStep(code, description);
      }
      // Don't record subsequent navigations (like clicking links) as they should be handled by click events
    }

    addRecordingListeners(doc) {
      doc.addEventListener("click", this.handleClick, true);
      doc.addEventListener("contextmenu", this.handleClick, true); // Capture right-click events
      doc.addEventListener("focus", this.handleFocus, true);
      doc.addEventListener("blur", this.handleBlur, true);
      doc.addEventListener("keydown", this.handleKeyDown, true);
      doc.addEventListener("change", this.handleChange, true);

      // Add to nested frames
      Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
        try {
          if (frame.contentDocument) {
            this.addRecordingListeners(frame.contentDocument);
          }
        } catch (e) {}
      });
    }

    removeRecordingListeners(doc) {
      doc.removeEventListener("click", this.handleClick, true);
      doc.removeEventListener("contextmenu", this.handleClick, true); // Remove right-click event listener
      doc.removeEventListener("focus", this.handleFocus, true);
      doc.removeEventListener("blur", this.handleBlur, true);
      doc.removeEventListener("keydown", this.handleKeyDown, true);
      doc.removeEventListener("change", this.handleChange, true);

      // Remove from nested frames
      Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
        try {
          if (frame.contentDocument) {
            this.removeRecordingListeners(frame.contentDocument);
          }
        } catch (e) {}
      });
    }

    start() {
      if (this.isRecording) return;

      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.initialUrl = null; // Reset initial URL tracking
      this.addRecordingListeners(document);

      // Start health check
      startHealthCheck();

      // Send initial navigation step
      this.recordNavigation(window.location.href);

      postMessageToParent({
        action: "recording-started",
        url: window.location.href,
      });
    }

    stop() {
      if (!this.isRecording) return;

      this.isRecording = false;
      this.recordingStartTime = null;
      this.initialUrl = null; // Reset initial URL tracking
      this.removeRecordingListeners(document);

      // Stop health check
      stopHealthCheck();

      // Clear any pending click timeout
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
      }
      this.lastClickTimestamp = null;

      // Clear tracking data
      this.focusedElements.clear();
      this.lastRecordedValues.clear();

      postMessageToParent({
        action: "recording-stopped",
      });
    }

    // Method to clear all pending timeouts and reset state
    clearPendingTimeouts() {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
      }
      this.lastClickTimestamp = null;
    }

    getStatus() {
      return {
        isRecording: this.isRecording,
        startTime: this.recordingStartTime,
      };
    }
  }

  // Create recorder instance
  const recorder = new PlaywrightRecorder();

  // Health check to monitor recording system
  let healthCheckInterval = null;

  function startHealthCheck() {
    if (healthCheckInterval) return;

    healthCheckInterval = setInterval(() => {
      if (recorder.isRecording) {
        // Check if there's a timeout that's been pending for too long (> 5 seconds)
        if (recorder.clickTimeout && recorder.lastClickTimestamp) {
          const timeSinceLastClick = Date.now() - recorder.lastClickTimestamp;
          if (timeSinceLastClick > 5000) {
            console.log(
              "PlaywrightRecorder: Clearing stuck timeout after",
              timeSinceLastClick,
              "ms"
            );
            // Clear stuck timeout
            clearTimeout(recorder.clickTimeout);
            recorder.clickTimeout = null;
            recorder.lastClickTimestamp = null;
          }
        }

        // Check if event listeners are still attached by testing a dummy event
        try {
          const testEvent = new Event("click", { bubbles: true });
          const testElement = document.createElement("div");
          let listenerCalled = false;

          const testListener = () => {
            listenerCalled = true;
          };
          testElement.addEventListener("click", testListener);
          testElement.dispatchEvent(testEvent);
          testElement.removeEventListener("click", testListener);

          if (!listenerCalled) {
            console.log(
              "PlaywrightRecorder: Event system seems broken, but this is expected for synthetic events"
            );
          }

          // More reliable check: verify our recorder's isRecording state and re-add listeners if needed
          if (recorder.isRecording) {
            // Re-add listeners to ensure they're still active
            recorder.addRecordingListeners(document);
          }
        } catch (e) {
          console.log("PlaywrightRecorder: Error during health check:", e);
        }
      }
    }, 1000); // Check every second
  }

  function stopHealthCheck() {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
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

  function onMouseLeaveDocument(e) {
    if (!e.target?.ownerDocument) {
      return;
    }
    hideHighlightRecursive(e.target?.ownerDocument.defaultView);
  }

  // Recursively add/remove listeners to all frames and iframes
  function addLocatorListeners(doc) {
    doc.addEventListener("mousemove", highlightElementAtPoint, true);
    doc.addEventListener("mouseleave", onMouseLeaveDocument, true);
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
    doc.removeEventListener("mouseleave", onMouseLeaveDocument, true);
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

                  // Add recording listeners if recording is active
                  if (recorder.getStatus().isRecording) {
                    recorder.addRecordingListeners(node.contentDocument);
                  }
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
                  recorder.removeRecordingListeners(node.contentDocument);
                }
              } catch (e) {}
            }
          });
      }
    });
    mutationObserver.observe(doc.body, { childList: true, subtree: true });
  }

  window.addEventListener("DOMContentLoaded", function () {
    postMessageToParent({ action: "frame-loaded", url: window.location.href });

    // Check if recording should be resumed after iframe refresh
    postMessageToParent({ action: "recording-status-check" });

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
      } else if (e.data.action === "start-recording") {
        recorder.start();
      } else if (e.data.action === "stop-recording") {
        recorder.stop();
      } else if (e.data.action === "resume-recording") {
        // Resume recording after iframe refresh
        recorder.start();
      } else if (e.data.action === "navigate-back") {
        window.history.back();
      } else if (e.data.action === "navigate-forward") {
        window.history.forward();
      } else if (e.data.action === "navigate-refresh") {
        window.location.reload();
      } else if (e.data.action === "navigate-to" && typeof e.data.url === "string") {
        window.location.assign(e.data.url);
      }
    });
  });

  // Clear any pending timeouts when the page is about to unload
  window.addEventListener("beforeunload", function () {
    recorder.clearPendingTimeouts();
  });

  // Also clear timeouts when the page is hidden (e.g., tab switching)
  window.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      recorder.clearPendingTimeouts();
    }
  });
})();

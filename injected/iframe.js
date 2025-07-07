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
    console.log(el);
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

  // New Playwright Recorder Implementation
  class PlaywrightRecorder {
    constructor() {
      this.isRecording = false;
      this.recordingStartTime = null;
      this.trackedInputs = new Map(); // Track input elements and their initial values
      this.userTypedInputs = new Set(); // Track inputs that user actually typed in
      this.lastClickEvent = null; // Track last click to detect double clicks
      this.initialUrl = null;

      // Bind event handlers
      this.handleClick = this.handleClick.bind(this);
      this.handleContextMenu = this.handleContextMenu.bind(this);
      this.handleFocus = this.handleFocus.bind(this);
      this.handleBlur = this.handleBlur.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleChange = this.handleChange.bind(this);
      this.handleInput = this.handleInput.bind(this);
    }

    // Simple helper function to get target element
    getTargetElement(e) {
      const path = e.composedPath();
      let element = path && path.length > 0 ? path[0] : e.target;
      return element;
    }

    generatePlaywrightCode(action, element, value = null) {
      const locator = getChainedLocator(element);
      const baseLocator = `page.${locator}`;

      switch (action) {
        case "click":
          return `await ${baseLocator}.click();`;
        case "dblclick":
          return `await ${baseLocator}.dblclick();`;
        case "rightClick":
          return `await ${baseLocator}.click({ button: 'right' });`;
        case "fill":
          return `await ${baseLocator}.fill('${value.replace(/'/g, "\\'")}');`;
        case "check":
          return `await ${baseLocator}.check();`;
        case "uncheck":
          return `await ${baseLocator}.uncheck();`;
        case "select":
          return `await ${baseLocator}.selectOption('${value.replace(/'/g, "\\'")}');`;
        case "press":
          return `await ${baseLocator}.press('${value}');`;
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

    recordNavigation(url) {
      if (!this.isRecording) return;

      if (this.initialUrl === null) {
        this.initialUrl = url;
        const code = `await page.goto('${url}');`;
        const description = `navigate to ${url}`;
        this.sendRecordingStep(code, description);
      }
    }

    handleClick(e) {
      if (!this.isRecording) return;

      // Process any pending blur events from input elements first
      // This ensures fill events are recorded before click events
      // But only for inputs the user actually typed in
      document.querySelectorAll("input, textarea").forEach((input) => {
        if (
          this.trackedInputs.has(input) &&
          input !== e.target &&
          this.userTypedInputs.has(input)
        ) {
          const initialValue = this.trackedInputs.get(input);
          const currentValue = input.value || "";

          if (currentValue !== initialValue) {
            const code = this.generatePlaywrightCode("fill", input, currentValue);
            const description = `fill ${this.getElementDescription(input)} with "${currentValue}"`;
            this.sendRecordingStep(code, description);
            this.trackedInputs.set(input, currentValue);
          }
        }
      });

      // Use simplified target element detection
      const element = this.getTargetElement(e);

      if (!element || element.tagName === "IFRAME" || element.tagName === "FRAME") return;

      // Handle double click detection
      if (
        this.lastClickEvent &&
        this.lastClickEvent.target === element &&
        e.timeStamp - this.lastClickEvent.timeStamp < 500
      ) {
        // This is a double click - record double click and clear the single click flag
        try {
          const code = this.generatePlaywrightCode("dblclick", element);
          const description = `double click on ${this.getElementDescription(element)}`;
          this.sendRecordingStep(code, description);
        } catch (error) {
          console.warn("Failed to generate double click code:", error);
        }
        this.lastClickEvent = null; // Reset to prevent triple clicks
        return;
      }

      // Store this click event for double click detection
      this.lastClickEvent = { target: element, timeStamp: e.timeStamp };

      try {
        // Handle different element types
        if (element.type === "checkbox") {
          const action = element.checked ? "check" : "uncheck";
          const code = this.generatePlaywrightCode(action, element);
          const description = `${action} ${this.getElementDescription(element)}`;
          this.sendRecordingStep(code, description);
          return; // Don't record click for checkboxes
        } else if (element.type === "radio") {
          const code = this.generatePlaywrightCode("check", element);
          const description = `check ${this.getElementDescription(element)}`;
          this.sendRecordingStep(code, description);
          return; // Don't record click for radio buttons
        } else if (element.tagName === "SELECT") {
          // Don't record click for select - will be handled by change event
          return;
        } else {
          // Check if this click is on a label or parent element that controls a checkbox/radio
          const associatedInput = this.findAssociatedInput(element);
          if (
            associatedInput &&
            (associatedInput.type === "checkbox" || associatedInput.type === "radio")
          ) {
            // This click will trigger the input change, so don't record the click
            // The change will be handled by the input's own click event
            return;
          }

          // Regular click - record immediately
          console.log(element);
          const code = this.generatePlaywrightCode("click", element);
          const description = `click on ${this.getElementDescription(element)}`;
          this.sendRecordingStep(code, description);
        }
      } catch (error) {
        console.warn("Failed to generate click code:", error);
      }
    }

    handleContextMenu(e) {
      if (!this.isRecording) return;

      // Use simplified target element detection
      const element = this.getTargetElement(e);

      if (!element || element.tagName === "IFRAME" || element.tagName === "FRAME") return;

      try {
        const code = this.generatePlaywrightCode("rightClick", element);
        const description = `right click on ${this.getElementDescription(element)}`;
        this.sendRecordingStep(code, description);
      } catch (error) {
        console.warn("Failed to generate right click code:", error);
      }
    }

    handleFocus(e) {
      if (!this.isRecording) return;

      // Use the generic target element detection
      const element = this.getTargetElement(e);

      if (!element) return;

      // Track input elements when they receive focus
      if (this.isInputElement(element)) {
        this.trackedInputs.set(element, element.value || "");
      }
    }

    handleBlur(e) {
      if (!this.isRecording) return;

      // Use the generic target element detection
      const element = this.getTargetElement(e);

      if (!element) return;

      // Check if input value changed and record fill event
      // But only if the user actually typed in this input
      if (this.trackedInputs.has(element) && this.userTypedInputs.has(element)) {
        const initialValue = this.trackedInputs.get(element);
        const currentValue = element.value || "";

        if (currentValue !== initialValue) {
          const code = this.generatePlaywrightCode("fill", element, currentValue);
          const description = `fill ${this.getElementDescription(element)} with "${currentValue}"`;
          this.sendRecordingStep(code, description);
        }
      }

      // Clean up tracking for this element
      this.trackedInputs.delete(element);
      this.userTypedInputs.delete(element);
    }

    handleKeyDown(e) {
      if (!this.isRecording) return;

      // Use the generic target element detection
      const element = this.getTargetElement(e);

      if (!element) return;

      // Handle Enter key in input fields
      if (e.key === "Enter" && this.isInputElement(element)) {
        // First record fill if value changed and user actually typed
        if (this.trackedInputs.has(element) && this.userTypedInputs.has(element)) {
          const initialValue = this.trackedInputs.get(element);
          const currentValue = element.value || "";

          if (currentValue !== initialValue) {
            const fillCode = this.generatePlaywrightCode("fill", element, currentValue);
            const fillDescription = `fill ${this.getElementDescription(
              element
            )} with "${currentValue}"`;
            this.sendRecordingStep(fillCode, fillDescription);
            // Update tracked value to prevent duplicate fill events
            this.trackedInputs.set(element, currentValue);
          }
        }

        // Then record the Enter press
        const pressCode = this.generatePlaywrightCode("press", element, "Enter");
        const pressDescription = `press Enter in ${this.getElementDescription(element)}`;
        this.sendRecordingStep(pressCode, pressDescription);
      }
      // Handle Tab key - record fill first, then press
      else if (e.key === "Tab" && this.isInputElement(element)) {
        // First record fill if value changed and user actually typed
        if (this.trackedInputs.has(element) && this.userTypedInputs.has(element)) {
          const initialValue = this.trackedInputs.get(element);
          const currentValue = element.value || "";

          if (currentValue !== initialValue) {
            const fillCode = this.generatePlaywrightCode("fill", element, currentValue);
            const fillDescription = `fill ${this.getElementDescription(
              element
            )} with "${currentValue}"`;
            this.sendRecordingStep(fillCode, fillDescription);
            // Update tracked value to prevent duplicate fill events
            this.trackedInputs.set(element, currentValue);
          }
        }

        // Then record the Tab press
        const pressCode = this.generatePlaywrightCode("press", element, "Tab");
        const pressDescription = `press Tab in ${this.getElementDescription(element)}`;
        this.sendRecordingStep(pressCode, pressDescription);
      }
      // Handle other special keys - record fill first if in input, then press
      else if (["Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        // For input elements, record fill first if value changed and user actually typed
        if (
          this.isInputElement(element) &&
          this.trackedInputs.has(element) &&
          this.userTypedInputs.has(element)
        ) {
          const initialValue = this.trackedInputs.get(element);
          const currentValue = element.value || "";

          if (currentValue !== initialValue) {
            const fillCode = this.generatePlaywrightCode("fill", element, currentValue);
            const fillDescription = `fill ${this.getElementDescription(
              element
            )} with "${currentValue}"`;
            this.sendRecordingStep(fillCode, fillDescription);
            // Update tracked value to prevent duplicate fill events
            this.trackedInputs.set(element, currentValue);
          }
        }

        // Then record the key press
        const code = this.generatePlaywrightCode("press", element, e.key);
        const description = `press ${e.key}`;
        this.sendRecordingStep(code, description);
      }
    }

    handleChange(e) {
      if (!this.isRecording) return;

      // Use the generic target element detection
      const element = this.getTargetElement(e);

      if (!element) return;

      if (element.tagName === "SELECT") {
        const selectedOption = element.options[element.selectedIndex];
        const value = selectedOption ? selectedOption.value : "";
        const code = this.generatePlaywrightCode("select", element, value);
        const description = `select "${
          selectedOption?.text || value
        }" from ${this.getElementDescription(element)}`;
        this.sendRecordingStep(code, description);
      }
    }

    handleInput(e) {
      if (!this.isRecording) return;

      // Use the generic target element detection
      const element = this.getTargetElement(e);

      if (!element) return;

      // Track that user is actively typing in this input
      if (this.isInputElement(element)) {
        this.userTypedInputs.add(element);
        // Don't record fill immediately on input - wait for blur or key events
      }
    }

    isInputElement(element) {
      return (
        (element.tagName === "INPUT" &&
          !["checkbox", "radio", "button", "submit", "reset", "file"].includes(element.type)) ||
        element.tagName === "TEXTAREA"
      );
    }

    getElementDescription(element) {
      if (element.id) return `#${element.id}`;
      if (element.name) return `[name="${element.name}"]`;
      return element.tagName.toLowerCase();
    }

    addRecordingListeners(doc) {
      doc.addEventListener("click", this.handleClick, true);
      doc.addEventListener("contextmenu", this.handleContextMenu, true);
      doc.addEventListener("focus", this.handleFocus, true);
      doc.addEventListener("blur", this.handleBlur, true);
      doc.addEventListener("keydown", this.handleKeyDown, true);
      doc.addEventListener("change", this.handleChange, true);
      doc.addEventListener("input", this.handleInput, true);

      // Add to nested frames
      Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
        try {
          if (frame.contentDocument) {
            this.addRecordingListeners(frame.contentDocument);
          }
        } catch (e) {
          // Cross-origin frame, ignore
        }
      });
    }

    removeRecordingListeners(doc) {
      doc.removeEventListener("click", this.handleClick, true);
      doc.removeEventListener("contextmenu", this.handleContextMenu, true);
      doc.removeEventListener("focus", this.handleFocus, true);
      doc.removeEventListener("blur", this.handleBlur, true);
      doc.removeEventListener("keydown", this.handleKeyDown, true);
      doc.removeEventListener("change", this.handleChange, true);
      doc.removeEventListener("input", this.handleInput, true);

      // Remove from nested frames
      Array.from(doc.querySelectorAll("iframe, frame")).forEach((frame) => {
        try {
          if (frame.contentDocument) {
            this.removeRecordingListeners(frame.contentDocument);
          }
        } catch (e) {
          // Cross-origin frame, ignore
        }
      });
    }

    start() {
      if (this.isRecording) return;

      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.initialUrl = null;
      this.trackedInputs.clear();
      this.userTypedInputs.clear();
      this.lastClickEvent = null;

      this.addRecordingListeners(document);
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
      this.initialUrl = null;
      this.trackedInputs.clear();
      this.userTypedInputs.clear();
      this.lastClickEvent = null;

      this.removeRecordingListeners(document);

      postMessageToParent({
        action: "recording-stopped",
      });
    }

    getStatus() {
      return {
        isRecording: this.isRecording,
        startTime: this.recordingStartTime,
      };
    }

    // Helper method to find associated input for labels or parent elements
    findAssociatedInput(element) {
      // Check if it's a label with 'for' attribute
      if (element.tagName === "LABEL" && element.htmlFor) {
        return document.getElementById(element.htmlFor);
      }

      // Check if it's a label containing an input
      if (element.tagName === "LABEL") {
        const input = element.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input) return input;
      }

      // Check if the element contains a checkbox/radio as a child
      const childInput = element.querySelector('input[type="checkbox"], input[type="radio"]');
      if (childInput) return childInput;

      // Check if the element is a child of a label
      const parentLabel = element.closest("label");
      if (parentLabel) {
        if (parentLabel.htmlFor) {
          return document.getElementById(parentLabel.htmlFor);
        }
        const input = parentLabel.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input) return input;
      }

      return null;
    }
  }

  // Create recorder instance
  const recorder = new PlaywrightRecorder();

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
})();

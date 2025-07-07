# Iframe.js Architecture Documentation

## Overview

The `iframe.js` file is a critical component of the Playcraft Playwright recorder that runs inside iframe contexts. It provides two main functionalities:

1. **Element Highlighting and Locator Inspection** - Visual feedback and locator generation for UI elements
2. **Playwright Action Recording** - Capturing user interactions and converting them to Playwright test code

This document provides a detailed technical overview of the architecture, data flow, and implementation details.

## Table of Contents

- [Core Architecture](#core-architecture)
- [Element Highlighting & Locator Inspection](#element-highlighting--locator-inspection)
- [Playwright Recorder Module](#playwright-recorder-module)
- [Cross-Frame Communication](#cross-frame-communication)
- [Event Flow Diagrams](#event-flow-diagrams)
- [API Reference](#api-reference)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Core Architecture

### Entry Point and Initialization

```javascript
(function () {
  if (window.self === window.top) {
    return; // Only run in iframe contexts
  }
  // ... initialization code
})();
```

The module uses an IIFE (Immediately Invoked Function Expression) that only executes in iframe contexts, ensuring it doesn't interfere with the main application window.

### Key Components

1. **Utility Functions** - Core helper functions for DOM manipulation and Playwright integration
2. **PlaywrightRecorder Class** - Main recording engine
3. **Event Management System** - Cross-frame event handling and mutation observation
4. **Message Communication Layer** - Parent-child window communication

### Global State Management

- **Mutation Observer** - Tracks dynamically added/removed iframes
- **Recorder Instance** - Single global instance for the iframe
- **Event Listeners** - Managed per document and nested frames

---

## Element Highlighting & Locator Inspection

### Architecture Overview

The locator inspection system provides real-time visual feedback and generates Playwright selectors for elements under the mouse cursor.

### Core Functions

#### 1. Element Detection at Point

```javascript
function deepElementFromPoint(win, e) {
  // Recursively finds the deepest element across nested frames
  // Handles cross-origin restrictions gracefully
}
```

**Flow:**
1. Get element at cursor position using `elementFromPoint()`
2. Check if element is from `composedPath()` for shadow DOM support
3. Recursively traverse into iframes/frames
4. Handle cross-origin frame restrictions
5. Return the deepest accessible element and its window context

#### 2. Element Highlighting

```javascript
function highlightElement(win, el) {
  const selector = win.InjectedScript.generateSelector(el, {}).selector;
  win.InjectedScript.highlight(win.InjectedScript.parseSelector(selector));
}
```

**Integration with Playwright:**
- Uses Playwright's `InjectedScript.generateSelector()` for consistent selector generation
- Leverages Playwright's built-in highlighting system
- Maintains visual consistency with Playwright's native tools

#### 3. Chained Locator Generation

```javascript
function getChainedLocator(element) {
  // Builds frame-aware locator chains
  // Handles nested iframe contexts
  // Ignores 'aut-frame' (Application Under Test) frames
}
```

**Frame Traversal Logic:**
1. Start with target element
2. Walk up through frame hierarchy
3. Generate frame locator for each level: `frameLocator.contentFrame().elementLocator`
4. Skip frames named 'aut-frame' to avoid unnecessary nesting
5. Return complete chained locator

### Event Handlers for Locator Mode

#### Mouse Movement Handler
```javascript
function highlightElementAtPoint(e) {
  // Highlights element under cursor in real-time
  // Provides instant visual feedback
}
```

#### Click Handler
```javascript
function forwardLocatorToParent(e) {
  // Captures click and forwards locator to parent
  // Prevents default action and stops propagation
  // Generates final locator for selected element
}
```

### Lifecycle Management

#### Enabling Locator Mode
1. Add event listeners to document
2. Start mutation observer for dynamic iframes
3. Recursively add listeners to existing nested frames

#### Disabling Locator Mode
1. Hide all highlights across frame hierarchy
2. Remove all event listeners
3. Disconnect mutation observer
4. Clean up nested frame listeners

---

## Playwright Recorder Module

### Class Architecture

```javascript
class PlaywrightRecorder {
  constructor() {
    this.isRecording = false;
    this.recordingStartTime = null;
    this.trackedInputs = new Map();      // Input elements and their initial values
    this.userTypedInputs = new Set();    // Inputs that user actually typed in
    this.lastClickEvent = null;          // Double-click detection
    this.initialUrl = null;              // Starting URL for navigation
  }
}
```

### Core Recording Components

#### 1. Event Detection System

The recorder uses capture-phase event listeners to intercept user interactions before they reach the application:

```javascript
doc.addEventListener("click", this.handleClick, true);
doc.addEventListener("contextmenu", this.handleContextMenu, true);
doc.addEventListener("focus", this.handleFocus, true);
doc.addEventListener("blur", this.handleBlur, true);
doc.addEventListener("keydown", this.handleKeyDown, true);
doc.addEventListener("change", this.handleChange, true);
doc.addEventListener("input", this.handleInput, true);
```

#### 2. Target Element Detection

```javascript
getTargetElement(e) {
  const path = e.composedPath();
  let element = path && path.length > 0 ? path[0] : e.target;
  return element;
}
```

**SVG Handling:**
The system automatically handles SVG elements by traversing the composed path to find appropriate interactive parents, preventing errors in locator generation.

#### 3. Smart Input Tracking System

**Two-tier tracking approach:**

1. **`trackedInputs` Map** - Tracks all focused input elements and their initial values
2. **`userTypedInputs` Set** - Tracks only inputs where user actively typed

This prevents spurious fill events from programmatically updated inputs (e.g., dropdown selections).

### Event Handler Deep Dive

#### Click Event Handling

```javascript
handleClick(e) {
  // 1. Process pending blur events from user-typed inputs
  // 2. Detect target element (with SVG handling)
  // 3. Double-click detection and handling
  // 4. Element-specific actions (checkbox, radio, regular click)
  // 5. Associated input detection (labels, parent elements)
}
```

**Double-click Detection:**
- Tracks last click event with timestamp
- Detects double-clicks within 500ms window
- Prevents duplicate single-click events
- Generates appropriate `dblclick()` actions

**Checkbox/Radio Handling:**
- Generates semantic `check()`/`uncheck()` actions
- Prevents duplicate click events
- Handles label and parent element clicks
- Detects associated inputs through DOM traversal

#### Input Event Handling

**Input Event Flow:**
```
User Types → input event → Mark as user-typed → Continue tracking
Dropdown Selection → value change → No input event → No user-typed marking
```

**Blur Event Processing:**
- Only records fill events for user-typed inputs
- Prevents programmatic value changes from generating fill events
- Maintains proper event ordering

**Key Event Handling:**
```javascript
handleKeyDown(e) {
  if (e.key === "Enter" && this.isInputElement(element)) {
    // 1. Record fill event if value changed and user typed
    // 2. Record Enter key press
  }
  // Similar handling for Tab, Arrow keys, Escape
}
```

### Code Generation Engine

#### Action Mapping

```javascript
generatePlaywrightCode(action, element, value = null) {
  switch (action) {
    case "click": return `await ${baseLocator}.click();`;
    case "dblclick": return `await ${baseLocator}.dblclick();`;
    case "fill": return `await ${baseLocator}.fill('${value}');`;
    case "check": return `await ${baseLocator}.check();`;
    case "uncheck": return `await ${baseLocator}.uncheck();`;
    case "select": return `await ${baseLocator}.selectOption('${value}');`;
    case "press": return `await ${baseLocator}.press('${value}');`;
  }
}
```

#### Locator Integration

The recorder leverages the same locator generation system used by the inspection module:
- Uses `getChainedLocator()` for frame-aware selectors
- Integrates with Playwright's `InjectedScript.generateSelector()`
- Maintains consistency with Playwright's native locator strategies

### Smart Element Detection

#### Associated Input Detection

```javascript
findAssociatedInput(element) {
  // 1. Check if element is a label with 'for' attribute
  // 2. Check if label contains checkbox/radio
  // 3. Check if element contains checkbox/radio as child
  // 4. Check if element is child of a label
  // 5. Return associated input or null
}
```

This prevents recording both click and check events when users click on labels or parent elements containing checkboxes.

---

## Cross-Frame Communication

### Message Protocol

All communication between iframe and parent uses structured messages:

```javascript
{
  action: "action-type",
  ...data,
  from: "playcraft"
}
```

### Message Types

#### From Iframe to Parent

- `"frame-loaded"` - Iframe initialization complete
- `"locator"` - Generated locator from element selection
- `"recording-started"` - Recording session began
- `"recording-stopped"` - Recording session ended
- `"recording-step"` - Individual action recorded
- `"recording-status-check"` - Request recording status after refresh

#### From Parent to Iframe

- `"enable-locator"` - Start locator inspection mode
- `"disable-locator"` - Stop locator inspection mode
- `"clear-highlights"` - Remove all visual highlights
- `"start-recording"` - Begin recording session
- `"stop-recording"` - End recording session
- `"resume-recording"` - Resume after iframe refresh
- `"navigate-back"` / `"navigate-forward"` / `"navigate-refresh"` - Navigation commands
- `"navigate-to"` - Navigate to specific URL

### Dynamic Iframe Handling

```javascript
function observeIframes(doc) {
  mutationObserver = new MutationObserver((mutations) => {
    // Handle added iframes
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === "IFRAME" || node.tagName === "FRAME") {
        addLocatorListeners(node.contentDocument);
        if (recorder.getStatus().isRecording) {
          recorder.addRecordingListeners(node.contentDocument);
        }
      }
    });
    
    // Handle removed iframes
    mutation.removedNodes.forEach((node) => {
      if (node.tagName === "IFRAME" || node.tagName === "FRAME") {
        removeLocatorListeners(node.contentDocument);
        recorder.removeRecordingListeners(node.contentDocument);
      }
    });
  });
}
```

**Key Features:**
- Automatic detection of dynamically added iframes
- Recursive listener management
- Proper cleanup on iframe removal
- Cross-origin safety handling

---

## Event Flow Diagrams

### Locator Inspection Flow

```
User moves mouse → mousemove event
                 ↓
         highlightElementAtPoint()
                 ↓
         deepElementFromPoint()
                 ↓
    Find element across frames
                 ↓
         highlightElement()
                 ↓
    Playwright highlight system

User clicks → click event
            ↓
    forwardLocatorToParent()
            ↓
    Generate chained locator
            ↓
    Post message to parent
```

### Recording Flow

```
User action → Event captured (capture phase)
            ↓
    Target element detection
            ↓
    Action-specific processing
            ↓
    Code generation
            ↓
    Message to parent
            ↓
    Parent updates test code
```

### Input Tracking Flow

```
Focus → Track initial value
      ↓
User types → input event → Mark as user-typed
           ↓
Blur/Key event → Check if user-typed
               ↓
Generate fill code (if applicable)
```

---

## API Reference

### Core Functions

#### `getPlaywrightLocator(win, el)`
**Purpose:** Generate Playwright locator string for element
**Parameters:**
- `win` - Window object containing InjectedScript
- `el` - Target DOM element
**Returns:** Playwright locator string

#### `highlightElement(win, el)`
**Purpose:** Highlight element using Playwright's highlight system
**Parameters:**
- `win` - Window object
- `el` - Element to highlight

#### `getChainedLocator(element)`
**Purpose:** Generate frame-aware locator chain
**Parameters:**
- `element` - Target element
**Returns:** Complete locator chain with frame navigation

### PlaywrightRecorder Methods

#### `start()`
**Purpose:** Begin recording session
**Side Effects:**
- Adds event listeners
- Initializes tracking state
- Records initial navigation

#### `stop()`
**Purpose:** End recording session
**Side Effects:**
- Removes event listeners
- Clears tracking state
- Sends stop message

#### `generatePlaywrightCode(action, element, value)`
**Purpose:** Generate Playwright action code
**Parameters:**
- `action` - Action type (click, fill, check, etc.)
- `element` - Target element
- `value` - Optional value for fill/select actions
**Returns:** Playwright code string

#### `getTargetElement(e)`
**Purpose:** Extract target element from event with SVG handling
**Parameters:**
- `e` - DOM event object
**Returns:** Target DOM element

---

## Troubleshooting Guide

### Common Issues

#### 1. Locators Not Generated
**Symptoms:** No highlight or locator on element hover
**Causes:**
- Cross-origin iframe restrictions
- Missing InjectedScript in window context
- Event listeners not properly attached

**Solutions:**
- Check browser console for cross-origin errors
- Verify iframe accessibility
- Ensure proper listener attachment in `addLocatorListeners()`

#### 2. Double Events in Recording
**Symptoms:** Both click and check events for checkboxes
**Causes:**
- Improper element association detection
- Event propagation issues
- Missing return statements in handlers

**Solutions:**
- Verify `findAssociatedInput()` logic
- Check event handler return statements
- Ensure proper event stopping in handlers

#### 3. Spurious Fill Events
**Symptoms:** Fill events for programmatically updated inputs
**Causes:**
- Missing user interaction detection
- Improper input tracking

**Solutions:**
- Verify `userTypedInputs` tracking
- Check `handleInput()` event attachment
- Ensure proper blur event filtering

#### 4. Cross-Frame Issues
**Symptoms:** Recording/highlighting not working in nested iframes
**Causes:**
- Missing mutation observer
- Improper recursive listener attachment
- Cross-origin restrictions

**Solutions:**
- Verify `observeIframes()` is running
- Check recursive listener methods
- Handle cross-origin gracefully with try-catch

### Debugging Tools

#### Enable Debug Logging
```javascript
// Add to any handler method
console.log('Event:', e.type, 'Element:', element, 'Tracked:', this.trackedInputs.has(element));
```

#### Inspect Tracking State
```javascript
// In browser console
console.log('Tracked inputs:', recorder.trackedInputs);
console.log('User typed inputs:', recorder.userTypedInputs);
console.log('Recording status:', recorder.getStatus());
```

#### Monitor Message Flow
```javascript
// Add to message listener
window.addEventListener('message', (e) => {
  if (e.data.from === 'playcraft') {
    console.log('Message from iframe:', e.data);
  }
});
```

---

## Performance Considerations

### Memory Management
- Proper cleanup of tracking Maps and Sets
- Removal of event listeners on iframe destruction
- Mutation observer disconnection

### Event Efficiency
- Use of capture phase to minimize event handling
- Early returns to avoid unnecessary processing
- Debouncing for high-frequency events like mousemove

### Cross-Frame Optimization
- Lazy loading of nested frame listeners
- Graceful handling of inaccessible frames
- Minimal recursive traversal

---

## Security Considerations

### Cross-Origin Safety
- All frame access wrapped in try-catch blocks
- Graceful degradation when cross-origin restrictions apply
- No sensitive data passed through postMessage

### Content Security Policy
- Minimal inline script usage
- Event listener attachment rather than inline handlers
- Compatible with strict CSP policies

---

## Future Enhancements

### Planned Features
1. **Shadow DOM Support** - Enhanced support for web components
2. **Custom Event Recording** - Support for custom application events
3. **Intelligent Wait Detection** - Automatic wait strategy generation
4. **Performance Optimization** - Reduced memory footprint and faster processing

### Extension Points
- Custom action generators
- Pluggable locator strategies
- Application-specific event handlers
- Custom element detection rules

---

This documentation provides a comprehensive overview of the iframe.js architecture. For specific implementation details, refer to the inline code comments and the source code itself. 
import vm from "node:vm";

// Create an AbortController and get its signal
const controller = new AbortController();
const { signal } = controller;

// Sample JavaScript code to execute
const code = `
(async()=> {
signal.addEventListener('abort', () => {
  throw new Error('Aborted!');
});

await new Promise(r => setTimeout(r, 10000));
})()
`;

// Create a new context (sandbox)
const context = {
  setTimeout,
  console,
  signal,
};

(async () => {
  // Schedule abort after 2 seconds
  setTimeout(() => controller.abort(), 1000);

  try {
    const result = await vm.runInNewContext(code, context, { timeout: 10000 });
    console.log("Result:", result);
  } catch (err) {
    console.error("Caught error from VM:", err);
  }
})();

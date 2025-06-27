export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export const config = Object.freeze({
  port: PORT,
  serverUrl: `http://localhost:${PORT}`,
});

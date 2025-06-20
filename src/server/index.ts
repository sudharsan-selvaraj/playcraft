import { app } from "./app";
// import { createServer } from "http";
// import { Server as SocketIOServer } from "socket.io";

export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const getServerUrl = () => `http://localhost:${PORT}`;

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      resolve();
    });
  });
}

// Placeholder for SocketIO setup
// const httpServer = createServer(app);
// const io = new SocketIOServer(httpServer);
// io.on("connection", (socket) => {
//   console.log("Socket connected", socket.id);
// });

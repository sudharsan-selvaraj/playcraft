import { app } from "./app";
import { config } from "../config";
// import { createServer } from "http";
// import { Server as SocketIOServer } from "socket.io";

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`Server started on ${config.serverUrl}`);
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

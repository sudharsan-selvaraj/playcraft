import { Server as IOServer } from "socket.io";
import { eventBus } from "../../events/eventBus";
import http from "http";

let io: IOServer | null = null;

export function initSocketServer(server: http.Server) {
  io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    let sessionId: string | null = null;

    socket.on("ready", (data: { sessionId: string }) => {
      sessionId = data.sessionId;
      socket.join(sessionId);
    });

    socket.on("disconnect", () => {
      if (sessionId) {
        socket.leave(sessionId);
      }
    });
  });

  // Listen for log events from the event bus and forward to the correct room
  eventBus.on("log", ({ sessionId, message, level, timestamp }) => {
    if (io) {
      io.to(sessionId).emit("log", { message, level, timestamp });
    }
  });
}

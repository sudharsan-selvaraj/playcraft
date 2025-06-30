export type SessionEventTypes = {
  log: (payload: { sessionId: string; message: string; level: string; timestamp: number }) => void;
  status: (payload: { sessionId: string; status: string }) => void;
  error: (payload: { sessionId: string; error: Error | string }) => void;
  result: (payload: { sessionId: string; result: any }) => void;
};

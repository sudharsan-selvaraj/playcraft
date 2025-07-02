export type SessionEventTypes = {
  log: (payload: { sessionId: string; message: string; level: string; timestamp: number }) => void;
  status: (payload: { sessionId: string; status: string }) => void;
  error: (payload: { sessionId: string; error: Error | string }) => void;
  result: (payload: { sessionId: string; result: any }) => void;
  "execution-start": (payload: { sessionId: string; timestamp: number; status: string }) => void;
  "execution-complete": (payload: {
    sessionId: string;
    timestamp: number;
    success: boolean;
    status: string;
  }) => void;
  "step-start": (payload: { sessionId: string; step: number }) => void;
};

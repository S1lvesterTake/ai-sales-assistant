declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestStartedAt: number;
    }
  }
}

export {};

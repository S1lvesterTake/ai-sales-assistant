import { AuthenticatedUser } from '../auth/authenticated-user';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestStartedAt: number;
      user?: AuthenticatedUser;
    }
  }
}

export {};

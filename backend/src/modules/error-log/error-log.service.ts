import { Injectable } from '@nestjs/common';

export interface ErrorLogInput {
  source: string;
  message: string;
  metadata: Record<string, boolean | number | string | undefined>;
}

@Injectable()
export class ErrorLogService {
  async capture(input: ErrorLogInput): Promise<void> {
    // Database persistence is added in BE-02. Structured logs remain primary.
    void input;
    await Promise.resolve();
  }
}

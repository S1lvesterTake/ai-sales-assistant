import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { errorLogs } from '../../database/schema';

export interface ErrorLogInput {
  source: string;
  message: string;
  metadata: Record<string, boolean | number | string | undefined>;
}

@Injectable()
export class ErrorLogService {
  constructor(private readonly database: DatabaseService) {}

  async capture(input: ErrorLogInput): Promise<void> {
    try {
      await this.database.db.insert(errorLogs).values({
        source: input.source,
        message: input.message,
        metadata: input.metadata,
      });
    } catch {
      // Structured stdout/stderr logs remain authoritative.
    }
  }
}

import type { SystemLog } from "@/modules/system-logs/domain/system-log";

export interface SystemLogRepositoryPort {
  insert(log: Omit<SystemLog, "id" | "createdAt">): Promise<void>;
  /** Deletes the logs created before the date; returns how many. */
  purgeBefore(before: Date): Promise<number>;
}

export const SYSTEM_LOG_REPOSITORY = Symbol("SYSTEM_LOG_REPOSITORY");

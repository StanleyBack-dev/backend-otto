import type {
  SystemCategory,
  SystemLevel,
} from "@/common/logging/system-events";

export type SystemLog = {
  id: string;
  level: SystemLevel;
  category: SystemCategory;
  source: string;
  message: string;
  details: Record<string, unknown> | null;
  statusCode: number | null;
  durationMs: number | null;
  environment: string;
  createdAt: Date;
};

/** Logs older than this are deleted by the daily cleanup. */
export const LOG_RETENTION_DAYS = 90;

/** Texts are capped so a huge error never bloats the table. */
export const clip = (text: string, size: number) =>
  text.length > size ? `${text.slice(0, size - 1)}…` : text;

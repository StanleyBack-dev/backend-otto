import type { Briefing } from "@/modules/briefing/domain/briefing";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export interface BriefingRepositoryPort {
  findByDate(userId: string, date: string): Promise<Briefing | null>;
  /** Creates or replaces the briefing of that owner and date. */
  save(briefing: Omit<Briefing, "id" | "createdAt">): Promise<Briefing>;
  /** Newest first. */
  page(userId: string, page: PageRequest): Promise<Paginated<Briefing>>;
  /** Deletes briefings of local dates before `date`; returns how many. */
  purgeBefore(date: string): Promise<number>;
}

export const BRIEFING_REPOSITORY = Symbol("BRIEFING_REPOSITORY");

import type { FeedEntry } from "@/modules/news/domain/news";

export class FeedReaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedReaderError";
  }
}

// Reads an RSS or Atom feed. Throws FeedReaderError when the URL is not a
// readable feed.
export interface FeedReaderPort {
  read(url: string): Promise<{ title: string | null; entries: FeedEntry[] }>;
}

export const FEED_READER = Symbol("FEED_READER");

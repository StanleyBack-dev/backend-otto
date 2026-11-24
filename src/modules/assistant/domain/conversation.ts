// A conversation with the assistant: what was said and what it answered.
// Only the text turns are stored; the tool calls made to answer stay inside
// the request.
export enum MessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

export type Conversation = {
  id: string;
  userId: string;
  /** First words of the first question, to find it again. */
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  text: string;
  createdAt: Date;
};

export const QUESTION_MAX_LENGTH = 2000;
export const TITLE_MAX_LENGTH = 80;

/** Title of a new conversation: the start of its first question. */
export function conversationTitle(question: string): string {
  const text = question.trim().replace(/\s+/g, " ");
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH - 1)}…`
    : text;
}

/** The question as sent to the model: trimmed, never empty, never huge. */
export function normalizeQuestion(text: string): string | null {
  const question = text.trim();
  if (!question || question.length > QUESTION_MAX_LENGTH) return null;
  return question;
}

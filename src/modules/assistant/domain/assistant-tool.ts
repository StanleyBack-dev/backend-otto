// Something the assistant can look up to answer (weather, agenda, news…).
// Each module contributes its own tools; the model decides when to call them.

/** JSON Schema subset understood by every model provider. */
export type ToolParameters = {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "integer" | "boolean";
      description: string;
      enum?: string[];
    }
  >;
  required?: string[];
};

/** Who is asking and where, so a tool never needs fixed values. */
export type ToolContext = {
  userId: string;
  timeZone: string;
  language: string;
  location: { name: string | null; latitude: number; longitude: number } | null;
  now: Date;
};

export interface AssistantTool {
  /** snake_case, unique among the tools. */
  readonly name: string;
  /** Tells the model when to use it. */
  readonly description: string;
  readonly parameters: ToolParameters;
  /** Returns plain data; the model turns it into the spoken answer. */
  execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<Record<string, unknown>>;
}

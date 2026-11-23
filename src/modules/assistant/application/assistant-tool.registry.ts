import { Injectable } from "@nestjs/common";
import type { AssistantTool } from "@/modules/assistant/domain/assistant-tool";

// The tools the model may call. Each feature module (weather, agenda, news)
// registers its own on start-up, so the assistant never depends on them.
@Injectable()
export class AssistantToolRegistry {
  private readonly tools = new Map<string, AssistantTool>();

  register(tool: AssistantTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Assistant tool "${tool.name}" registered twice.`);
    }
    this.tools.set(tool.name, tool);
  }

  all(): AssistantTool[] {
    return [...this.tools.values()];
  }

  find(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }
}

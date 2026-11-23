import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AssistantConfig {
  /** Previous messages sent to the model as context. */
  readonly historyMessages: number;
  readonly maxToolRounds: number;

  constructor(config: ConfigService) {
    this.historyMessages = config.get<number>("ASSISTANT_HISTORY_MESSAGES", 12);
    this.maxToolRounds = config.get<number>("ASSISTANT_MAX_TOOL_ROUNDS", 4);
  }
}

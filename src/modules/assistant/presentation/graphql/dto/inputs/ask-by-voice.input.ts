import { Field, ID, InputType } from "@nestjs/graphql";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import {
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
} from "@/modules/assistant/domain/voice-audio";

@InputType()
export class AskByVoiceInput {
  @Field({ description: "A gravação da pergunta, em base64." })
  @IsString()
  @MaxLength(Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 100)
  audioBase64!: string;

  @Field({ description: "Ex.: audio/wav, audio/ogg." })
  @IsString()
  @IsIn([...AUDIO_TYPES])
  mimeType!: string;

  @Field(() => ID, {
    nullable: true,
    description: "Continua uma conversa; sem ele, começa uma nova.",
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

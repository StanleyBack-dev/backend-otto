import { Field, ID, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUUID, Length } from "class-validator";
import { QUESTION_MAX_LENGTH } from "@/modules/assistant/domain/conversation";

@InputType()
export class AskInput {
  @Field({ description: "A pergunta, digitada ou transcrita da voz." })
  @IsString()
  @Length(1, QUESTION_MAX_LENGTH)
  text!: string;

  @Field(() => ID, {
    nullable: true,
    description: "Continua uma conversa; sem ele, começa uma nova.",
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

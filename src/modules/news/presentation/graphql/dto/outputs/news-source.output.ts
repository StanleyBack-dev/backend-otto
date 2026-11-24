import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class NewsSourceOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  url!: string;

  @Field()
  category!: string;

  @Field()
  active!: boolean;

  @Field(() => Date, { nullable: true })
  lastFetchedAt!: Date | null;

  @Field(() => String, {
    nullable: true,
    description: "Erro da última leitura (null: leu bem).",
  })
  lastError!: string | null;
}

@ObjectType()
export class SuggestedNewsSourceOutput {
  @Field()
  name!: string;

  @Field()
  url!: string;

  @Field()
  category!: string;
}

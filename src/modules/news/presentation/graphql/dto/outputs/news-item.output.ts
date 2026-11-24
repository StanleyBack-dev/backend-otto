import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "@/common/graphql/pagination.graphql";

@ObjectType()
export class NewsItemOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  link!: string;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field()
  publishedAt!: Date;

  @Field()
  sourceName!: string;

  @Field()
  category!: string;
}

@ObjectType()
export class NewsItemPage extends Paginated(NewsItemOutput, "NewsItemPage") {}

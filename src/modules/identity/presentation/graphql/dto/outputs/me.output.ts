import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class MeOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => ID, { description: "O dispositivo que fez a requisição." })
  deviceId!: string;
}

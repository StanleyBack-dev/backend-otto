import { Field, ID, ObjectType } from "@nestjs/graphql";
import { DevicePlatform } from "@/modules/identity/presentation/graphql/identity.graphql-enums";

@ObjectType()
export class DeviceOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => DevicePlatform)
  platform!: DevicePlatform;

  @Field()
  lastSeenAt!: Date;

  @Field()
  createdAt!: Date;

  @Field({ description: "É o dispositivo que fez esta requisição." })
  current!: boolean;
}

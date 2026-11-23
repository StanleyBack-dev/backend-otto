import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AuthTokensOutput {
  @Field(() => ID, { description: "O dispositivo (sessão) desta conexão." })
  deviceId!: string;

  @Field()
  accessToken!: string;

  @Field()
  accessTokenExpiresAt!: Date;

  @Field({
    description: "Guarde com segurança: mantém o dispositivo conectado.",
  })
  refreshToken!: string;

  @Field()
  refreshTokenExpiresAt!: Date;
}

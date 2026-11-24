import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { ChangeOwnPasswordUseCase } from "@/modules/identity/application/use-cases/change-own-password.use-case";
import { LoginUseCase } from "@/modules/identity/application/use-cases/login.use-case";
import { ManageDevicesUseCase } from "@/modules/identity/application/use-cases/manage-devices.use-case";
import { RefreshSessionUseCase } from "@/modules/identity/application/use-cases/refresh-session.use-case";
import { UpdateOwnProfileUseCase } from "@/modules/identity/application/use-cases/update-own-profile.use-case";
import { ChangePasswordInput } from "@/modules/identity/presentation/graphql/dto/inputs/change-password.input";
import { LoginInput } from "@/modules/identity/presentation/graphql/dto/inputs/login.input";
import { RefreshSessionInput } from "@/modules/identity/presentation/graphql/dto/inputs/refresh-session.input";
import { UpdateProfileInput } from "@/modules/identity/presentation/graphql/dto/inputs/update-profile.input";
import { AuthTokensOutput } from "@/modules/identity/presentation/graphql/dto/outputs/auth-tokens.output";
import { MeOutput } from "@/modules/identity/presentation/graphql/dto/outputs/me.output";

@Resolver()
export class AuthResolver {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly devices: ManageDevicesUseCase,
    private readonly changePassword: ChangeOwnPasswordUseCase,
    private readonly updateProfile: UpdateOwnProfileUseCase,
  ) {}

  @Public()
  @Mutation(() => AuthTokensOutput, {
    description: "Conecta um dispositivo à conta.",
  })
  async login(@Args("input") input: LoginInput): Promise<AuthTokensOutput> {
    const result = await this.loginUseCase.execute(input);
    return {
      deviceId: result.deviceId,
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    };
  }

  @Public()
  @Mutation(() => AuthTokensOutput, {
    description: "Renova o token de acesso de um dispositivo conectado.",
  })
  refreshSession(
    @Args("input") input: RefreshSessionInput,
  ): Promise<AuthTokensOutput> {
    return this.refreshUseCase.execute(input.refreshToken);
  }

  @Mutation(() => Boolean, { description: "Desconecta este dispositivo." })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<boolean> {
    await this.devices.logout(user);
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Troca a senha e desconecta os outros dispositivos.",
  })
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: ChangePasswordInput,
  ): Promise<boolean> {
    await this.changePassword.execute(user, input);
    return true;
  }

  @Query(() => MeOutput, { description: "Quem está conectado." })
  me(@CurrentUser() user: AuthenticatedUser): MeOutput {
    return toMeOutput(user);
  }

  @Mutation(() => MeOutput, {
    description: "Muda o seu nome (como o assistente chama você).",
  })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: UpdateProfileInput,
  ): Promise<MeOutput> {
    return toMeOutput(await this.updateProfile.execute(user, input));
  }
}

function toMeOutput(user: AuthenticatedUser): MeOutput {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    deviceId: user.deviceId,
  };
}

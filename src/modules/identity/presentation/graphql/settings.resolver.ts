import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { UpdateLocationInput } from "@/modules/identity/presentation/graphql/dto/inputs/update-location.input";
import { UpdateSettingsInput } from "@/modules/identity/presentation/graphql/dto/inputs/update-settings.input";
import { SettingsOutput } from "@/modules/identity/presentation/graphql/dto/outputs/settings.output";

@Resolver(() => SettingsOutput)
export class SettingsResolver {
  constructor(private readonly settings: MySettingsUseCase) {}

  @Query(() => SettingsOutput, { description: "Preferências do assistente." })
  mySettings(@CurrentUser() user: AuthenticatedUser): Promise<SettingsOutput> {
    return this.settings.forUser(user.id);
  }

  @Mutation(() => SettingsOutput)
  updateMySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: UpdateSettingsInput,
  ): Promise<SettingsOutput> {
    return this.settings.update(user, input);
  }

  @Mutation(() => SettingsOutput, {
    description: "Atualiza a localização usada no clima e no resumo do dia.",
  })
  updateMyLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: UpdateLocationInput,
  ): Promise<SettingsOutput> {
    return this.settings.updateLocation(user, input);
  }
}

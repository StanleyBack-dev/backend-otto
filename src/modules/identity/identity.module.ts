import { Module, type OnApplicationBootstrap } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IdentityConfig } from "@/modules/identity/application/identity.config";
import { ACCESS_TOKEN } from "@/modules/identity/application/ports/access-token.port";
import { DEVICE_REPOSITORY } from "@/modules/identity/application/ports/device-repository.port";
import { PASSWORD_HASHER } from "@/modules/identity/application/ports/password-hasher.port";
import { SECRETS } from "@/modules/identity/application/ports/secrets.port";
import { SETTINGS_REPOSITORY } from "@/modules/identity/application/ports/settings-repository.port";
import { USER_REPOSITORY } from "@/modules/identity/application/ports/user-repository.port";
import { SessionTokensService } from "@/modules/identity/application/session-tokens.service";
import { ActiveUsersUseCase } from "@/modules/identity/application/use-cases/active-users.use-case";
import { AuthenticateUseCase } from "@/modules/identity/application/use-cases/authenticate.use-case";
import { BootstrapOwnerUseCase } from "@/modules/identity/application/use-cases/bootstrap-owner.use-case";
import { ChangeOwnPasswordUseCase } from "@/modules/identity/application/use-cases/change-own-password.use-case";
import { IdentityMaintenanceUseCase } from "@/modules/identity/application/use-cases/identity-maintenance.use-case";
import { LoginUseCase } from "@/modules/identity/application/use-cases/login.use-case";
import { ManageDevicesUseCase } from "@/modules/identity/application/use-cases/manage-devices.use-case";
import { MySettingsUseCase } from "@/modules/identity/application/use-cases/my-settings.use-case";
import { RefreshSessionUseCase } from "@/modules/identity/application/use-cases/refresh-session.use-case";
import { JwtAccessTokenService } from "@/modules/identity/infrastructure/crypto/jwt-access-token.service";
import { NodeSecrets } from "@/modules/identity/infrastructure/crypto/node-secrets";
import { ScryptPasswordHasher } from "@/modules/identity/infrastructure/crypto/scrypt-password-hasher";
import { DeviceOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/device.orm-entity";
import { UserSettingsOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/user-settings.orm-entity";
import { UserOrmEntity } from "@/modules/identity/infrastructure/persistence/entities/user.orm-entity";
import { DeviceTypeormRepository } from "@/modules/identity/infrastructure/persistence/repositories/device-typeorm.repository";
import { SettingsTypeormRepository } from "@/modules/identity/infrastructure/persistence/repositories/settings-typeorm.repository";
import { UserTypeormRepository } from "@/modules/identity/infrastructure/persistence/repositories/user-typeorm.repository";
import { AuthResolver } from "@/modules/identity/presentation/graphql/auth.resolver";
import { DevicesResolver } from "@/modules/identity/presentation/graphql/devices.resolver";
import { SettingsResolver } from "@/modules/identity/presentation/graphql/settings.resolver";
import { UserSessionGuard } from "@/modules/identity/presentation/guards/user-session.guard";
import { InternalIdentityController } from "@/modules/identity/presentation/http/internal-identity.controller";

// The owner account, the signed-in devices (one session each) and the
// assistant settings (location, voice, language).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      DeviceOrmEntity,
      UserSettingsOrmEntity,
    ]),
  ],
  controllers: [InternalIdentityController],
  providers: [
    IdentityConfig,
    SessionTokensService,
    ActiveUsersUseCase,
    AuthenticateUseCase,
    BootstrapOwnerUseCase,
    ChangeOwnPasswordUseCase,
    IdentityMaintenanceUseCase,
    LoginUseCase,
    ManageDevicesUseCase,
    MySettingsUseCase,
    RefreshSessionUseCase,
    UserSessionGuard,
    AuthResolver,
    DevicesResolver,
    SettingsResolver,
    { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
    { provide: DEVICE_REPOSITORY, useClass: DeviceTypeormRepository },
    { provide: SETTINGS_REPOSITORY, useClass: SettingsTypeormRepository },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: ACCESS_TOKEN, useClass: JwtAccessTokenService },
    { provide: SECRETS, useClass: NodeSecrets },
  ],
  exports: [UserSessionGuard, MySettingsUseCase, ActiveUsersUseCase],
})
export class IdentityModule implements OnApplicationBootstrap {
  constructor(private readonly bootstrapOwner: BootstrapOwnerUseCase) {}

  onApplicationBootstrap(): Promise<void> {
    return this.bootstrapOwner.execute();
  }
}

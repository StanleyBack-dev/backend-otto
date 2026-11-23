import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ParseUUIDPipe } from "@nestjs/common";
import type { AuthenticatedUser } from "@/common/auth/authenticated-user";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ManageDevicesUseCase } from "@/modules/identity/application/use-cases/manage-devices.use-case";
import { RenameDeviceInput } from "@/modules/identity/presentation/graphql/dto/inputs/rename-device.input";
import { DeviceOutput } from "@/modules/identity/presentation/graphql/dto/outputs/device.output";
import { toDeviceOutput } from "@/modules/identity/presentation/graphql/mappers/device.mapper";

// Connected devices. The list is small by nature (only live devices; ended
// ones are purged daily), so it is not paged.
@Resolver(() => DeviceOutput)
export class DevicesResolver {
  constructor(private readonly devices: ManageDevicesUseCase) {}

  @Query(() => [DeviceOutput], { description: "Dispositivos conectados." })
  async myDevices(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeviceOutput[]> {
    const devices = await this.devices.list(user);
    return devices.map((device) => toDeviceOutput(device, user.deviceId));
  }

  @Mutation(() => DeviceOutput)
  async renameDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Args("input") input: RenameDeviceInput,
  ): Promise<DeviceOutput> {
    const device = await this.devices.rename(user, input.deviceId, input.name);
    return toDeviceOutput(device, user.deviceId);
  }

  @Mutation(() => Boolean, {
    description: "Desconecta um dispositivo (ex.: celular antigo).",
  })
  async removeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Args("deviceId", { type: () => ID }, ParseUUIDPipe) deviceId: string,
  ): Promise<boolean> {
    await this.devices.remove(user, deviceId);
    return true;
  }
}

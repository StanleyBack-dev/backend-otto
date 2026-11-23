import type { Device } from "@/modules/identity/domain/device";
import type { DeviceOutput } from "@/modules/identity/presentation/graphql/dto/outputs/device.output";

export function toDeviceOutput(
  device: Device,
  currentDeviceId: string,
): DeviceOutput {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
    current: device.id === currentDeviceId,
  };
}

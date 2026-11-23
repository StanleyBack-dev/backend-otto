import { registerEnumType } from "@nestjs/graphql";
import { DevicePlatform } from "@/modules/identity/domain/device";

registerEnumType(DevicePlatform, {
  name: "DevicePlatform",
  description: "Sistema do dispositivo conectado.",
});

export { DevicePlatform };

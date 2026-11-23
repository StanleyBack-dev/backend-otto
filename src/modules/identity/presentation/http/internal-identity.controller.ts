import { Controller, HttpCode, Post } from "@nestjs/common";
import { InternalRoute } from "@/common/decorators/internal-route.decorator";
import { IdentityMaintenanceUseCase } from "@/modules/identity/application/use-cases/identity-maintenance.use-case";

// Daily cleanup called by the Routines workflow.
@Controller("internal/identity")
@InternalRoute()
export class InternalIdentityController {
  constructor(private readonly maintenance: IdentityMaintenanceUseCase) {}

  @Post("cleanup")
  @HttpCode(200)
  async cleanup(): Promise<{ devices: number }> {
    return { devices: await this.maintenance.purgeEndedDevices() };
  }
}

import { Controller, Get, SetMetadata } from "@nestjs/common";
import { SKIP_CLIENT_KEY } from "@/common/security/client-api-key.guard";

@Controller()
export class AppController {
  // Open health check for uptime monitors — exposes nothing else.
  @SetMetadata(SKIP_CLIENT_KEY, true)
  @Get()
  health() {
    return { service: "backend-otto", status: "ok" };
  }
}

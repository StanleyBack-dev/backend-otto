import { Global, Module } from "@nestjs/common";
import { CLOCK } from "@/shared/application/ports/clock.port";
import { SystemClock } from "@/shared/infrastructure/system-clock";

// Cross-module building blocks available everywhere.
@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class SharedModule {}

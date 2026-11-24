import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { SecretsPort } from "@/modules/identity/application/ports/secrets.port";

@Injectable()
export class NodeSecrets implements SecretsPort {
  private readonly key: string;

  constructor(config: ConfigService) {
    this.key = config.getOrThrow<string>("AUTH_HASH_SECRET");
  }

  randomToken(): string {
    return randomBytes(32).toString("base64url");
  }

  digest(value: string): string {
    return createHmac("sha256", this.key).update(value).digest("hex");
  }

  sameDigest(a: string, b: string): boolean {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  }
}

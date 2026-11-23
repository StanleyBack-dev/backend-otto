import type { INestApplication } from "@nestjs/common";
import express from "express";
import helmet from "helmet";

// Shared by the local server (main.ts) and the Vercel handler (serverless.ts).
// Body parsing is set up here (the app is created with bodyParser:false).
// The limit fits a short voice command sent as base64 audio (a few seconds
// of compressed speech) and nothing much bigger.
//
// No CORS: the desktop app calls the API from its main (Node) process, which
// browsers' same-origin rules don't apply to. A web client, if one comes,
// will add its origin here.
export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.enableShutdownHooks();
}

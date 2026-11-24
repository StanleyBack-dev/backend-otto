import { registerEnumType } from "@nestjs/graphql";

export enum NewsPeriodInput {
  TODAY = "TODAY",
  YESTERDAY = "YESTERDAY",
  RECENT = "RECENT",
}

registerEnumType(NewsPeriodInput, {
  name: "NewsPeriod",
  description: "Hoje (desde a meia-noite), ontem ou as últimas 24 horas.",
});

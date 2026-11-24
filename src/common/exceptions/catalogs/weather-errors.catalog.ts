import { HttpStatus } from "@nestjs/common";

export const weatherErrors = {
  locationRequired: {
    code: "WEATHER_LOCATION_REQUIRED",
    status: HttpStatus.BAD_REQUEST,
    message:
      "Ainda não sei onde você está. Compartilhe a localização ou escolha uma cidade.",
  },
  placeNotFound: {
    code: "WEATHER_PLACE_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: ({ place }: { place: string }) =>
      `Não encontrei nenhum lugar chamado "${place}".`,
  },
  unavailable: {
    code: "WEATHER_UNAVAILABLE",
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "A previsão do tempo está indisponível agora. Tente de novo.",
  },
} as const;

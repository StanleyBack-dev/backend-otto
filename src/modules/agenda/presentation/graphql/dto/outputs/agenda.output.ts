import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AgendaEventOutput {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  start!: Date;

  @Field()
  end!: Date;

  @Field()
  allDay!: boolean;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field({ description: "Agenda do evento (ex.: Rotina de Estudos)." })
  calendar!: string;
}

// The range is at most 7 days, so the events come in one list.
@ObjectType()
export class AgendaOutput {
  @Field({ description: "Primeiro dia (YYYY-MM-DD)." })
  from!: string;

  @Field({ description: "Último dia (YYYY-MM-DD)." })
  to!: string;

  @Field()
  timeZone!: string;

  @Field(() => [AgendaEventOutput])
  events!: AgendaEventOutput[];
}

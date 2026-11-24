import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

// numeric columns come back as strings from pg; the repository converts them.
@Entity("tb_user_settings")
export class UserSettingsOrmEntity {
  @PrimaryColumn("uuid", { name: "idtb_users" })
  userId!: string;

  @Column({ name: "assistant_name", type: "varchar", length: 40 })
  assistantName!: string;

  @Column({ type: "varchar", length: 35 })
  language!: string;

  @Column({ name: "time_zone", type: "varchar", length: 64 })
  timeZone!: string;

  @Column({
    name: "location_name",
    type: "varchar",
    length: 120,
    nullable: true,
  })
  locationName!: string | null;

  @Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
  latitude!: string | null;

  @Column({ type: "numeric", precision: 9, scale: 6, nullable: true })
  longitude!: string | null;

  @Column({ name: "location_updated_at", type: "timestamptz", nullable: true })
  locationUpdatedAt!: Date | null;

  @Column({ name: "speech_rate", type: "numeric", precision: 3, scale: 2 })
  speechRate!: string;

  @Column({ name: "auto_speak", type: "boolean" })
  autoSpeak!: boolean;

  @Column({ name: "wake_word_enabled", type: "boolean" })
  wakeWordEnabled!: boolean;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

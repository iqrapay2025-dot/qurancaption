import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "billing_events" ADD COLUMN "reference" varchar;
  ALTER TABLE "billing_events" ADD COLUMN "user" varchar;
  ALTER TABLE "billing_events" ADD COLUMN "outcome" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "billing_events" DROP COLUMN "reference";
  ALTER TABLE "billing_events" DROP COLUMN "user";
  ALTER TABLE "billing_events" DROP COLUMN "outcome";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp(3) with time zone;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_source" varchar;

    -- Everyone who exists right now is grandfathered as verified (Option A).
    -- New signups after this migration start as false via the column default.
    UPDATE "users"
    SET "email_verified" = true,
        "email_verified_at" = now(),
        "email_verification_source" = 'legacy';

    CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users" USING btree ("email_verified");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "users_email_verified_idx";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verification_source";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
  `)
}
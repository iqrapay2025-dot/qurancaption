import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Safety net for databases that drifted behind the code (e.g. an earlier verification
// migration was recorded as applied before it contained every column, or migrations did
// not run on a deploy). Fully idempotent: safe on fresh, current and drifted databases.
//
// Existing accounts are grandfathered as verified ONLY if the email_verified column did
// not exist yet (same intent as 20261113_160000_email_verification). If the column already
// exists, no user data is touched.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'email_verified'
      ) THEN
        ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp(3) with time zone;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_source" varchar;
        UPDATE "users"
        SET "email_verified" = true,
            "email_verified_at" = now(),
            "email_verification_source" = 'legacy';
      END IF;
    END $$;

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_token" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_token_expires" timestamp(3) with time zone;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp(3) with time zone;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_source" varchar;
    CREATE INDEX IF NOT EXISTS "users_email_verified_idx" ON "users" USING btree ("email_verified");
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally a no-op: this migration only repairs drift and must never drop columns.
}

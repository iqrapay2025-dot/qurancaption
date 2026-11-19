import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'enum_users_provider' AND e.enumlabel = 'stripe'
     ) THEN
       UPDATE "users" SET "provider" = NULL WHERE "provider" = 'stripe';
       ALTER TABLE "users" ALTER COLUMN "provider" SET DATA TYPE text;
       DROP TYPE "public"."enum_users_provider";
       CREATE TYPE "public"."enum_users_provider" AS ENUM('paystack', 'flutterwave');
       ALTER TABLE "users" ALTER COLUMN "provider" SET DATA TYPE "public"."enum_users_provider" USING "provider"::"public"."enum_users_provider";
     END IF;
   END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_provider" ADD VALUE 'stripe' BEFORE 'flutterwave';`)
}

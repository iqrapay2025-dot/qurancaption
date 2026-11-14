import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "usage_auto_time" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "month" varchar NOT NULL,
    "count" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE "usage_auto_time_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "admins_id" integer,
    "users_id" integer
   );

   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "usage_auto_time_id" integer;

   ALTER TABLE "usage_auto_time" ADD CONSTRAINT "usage_auto_time_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
   ALTER TABLE "usage_auto_time_rels" ADD CONSTRAINT "usage_auto_time_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."usage_auto_time"("id") ON DELETE cascade ON UPDATE no action;
   ALTER TABLE "usage_auto_time_rels" ADD CONSTRAINT "usage_auto_time_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
   ALTER TABLE "usage_auto_time_rels" ADD CONSTRAINT "usage_auto_time_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

   CREATE INDEX "usage_auto_time_user_idx" ON "usage_auto_time" USING btree ("user_id");
   CREATE INDEX "usage_auto_time_month_idx" ON "usage_auto_time" USING btree ("month");
   CREATE INDEX "usage_auto_time_updated_at_idx" ON "usage_auto_time" USING btree ("updated_at");
   CREATE INDEX "usage_auto_time_created_at_idx" ON "usage_auto_time" USING btree ("created_at");
   CREATE UNIQUE INDEX "usage_auto_time_user_month_idx" ON "usage_auto_time" USING btree ("user_id", "month");

   CREATE INDEX "usage_auto_time_rels_order_idx" ON "usage_auto_time_rels" USING btree ("order");
   CREATE INDEX "usage_auto_time_rels_parent_idx" ON "usage_auto_time_rels" USING btree ("parent_id");
   CREATE INDEX "usage_auto_time_rels_path_idx" ON "usage_auto_time_rels" USING btree ("path");
   CREATE INDEX "usage_auto_time_rels_admins_id_idx" ON "usage_auto_time_rels" USING btree ("admins_id");
   CREATE INDEX "usage_auto_time_rels_users_id_idx" ON "usage_auto_time_rels" USING btree ("users_id");

   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usage_auto_time_fk" FOREIGN KEY ("usage_auto_time_id") REFERENCES "public"."usage_auto_time"("id") ON DELETE cascade ON UPDATE no action;
   CREATE INDEX "payload_locked_documents_rels_usage_auto_time_id_idx" ON "payload_locked_documents_rels" USING btree ("usage_auto_time_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "usage_auto_time" DISABLE ROW LEVEL SECURITY;
   ALTER TABLE "usage_auto_time_rels" DISABLE ROW LEVEL SECURITY;

   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_usage_auto_time_fk";
   DROP INDEX "payload_locked_documents_rels_usage_auto_time_id_idx";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "usage_auto_time_id";

   DROP TABLE "usage_auto_time" CASCADE;
   DROP TABLE "usage_auto_time_rels" CASCADE;`)
}

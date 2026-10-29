import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "usage_verses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"month" varchar NOT NULL,
  	"verse_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "usage_verses_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "usage_projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"month" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "usage_projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"users_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "usage_verses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "usage_projects_id" integer;
  ALTER TABLE "usage_verses" ADD CONSTRAINT "usage_verses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "usage_verses_rels" ADD CONSTRAINT "usage_verses_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."usage_verses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usage_verses_rels" ADD CONSTRAINT "usage_verses_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usage_verses_rels" ADD CONSTRAINT "usage_verses_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usage_projects" ADD CONSTRAINT "usage_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "usage_projects_rels" ADD CONSTRAINT "usage_projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."usage_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usage_projects_rels" ADD CONSTRAINT "usage_projects_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usage_projects_rels" ADD CONSTRAINT "usage_projects_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "usage_verses_user_idx" ON "usage_verses" USING btree ("user_id");
  CREATE INDEX "usage_verses_month_idx" ON "usage_verses" USING btree ("month");
  CREATE INDEX "usage_verses_updated_at_idx" ON "usage_verses" USING btree ("updated_at");
  CREATE INDEX "usage_verses_created_at_idx" ON "usage_verses" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_month_verseKey_idx" ON "usage_verses" USING btree ("user_id","month","verse_key");
  CREATE INDEX "usage_verses_rels_order_idx" ON "usage_verses_rels" USING btree ("order");
  CREATE INDEX "usage_verses_rels_parent_idx" ON "usage_verses_rels" USING btree ("parent_id");
  CREATE INDEX "usage_verses_rels_path_idx" ON "usage_verses_rels" USING btree ("path");
  CREATE INDEX "usage_verses_rels_admins_id_idx" ON "usage_verses_rels" USING btree ("admins_id");
  CREATE INDEX "usage_verses_rels_users_id_idx" ON "usage_verses_rels" USING btree ("users_id");
  CREATE INDEX "usage_projects_user_idx" ON "usage_projects" USING btree ("user_id");
  CREATE INDEX "usage_projects_month_idx" ON "usage_projects" USING btree ("month");
  CREATE INDEX "usage_projects_updated_at_idx" ON "usage_projects" USING btree ("updated_at");
  CREATE INDEX "usage_projects_created_at_idx" ON "usage_projects" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_month_idx" ON "usage_projects" USING btree ("user_id","month");
  CREATE INDEX "usage_projects_rels_order_idx" ON "usage_projects_rels" USING btree ("order");
  CREATE INDEX "usage_projects_rels_parent_idx" ON "usage_projects_rels" USING btree ("parent_id");
  CREATE INDEX "usage_projects_rels_path_idx" ON "usage_projects_rels" USING btree ("path");
  CREATE INDEX "usage_projects_rels_admins_id_idx" ON "usage_projects_rels" USING btree ("admins_id");
  CREATE INDEX "usage_projects_rels_users_id_idx" ON "usage_projects_rels" USING btree ("users_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usage_verses_fk" FOREIGN KEY ("usage_verses_id") REFERENCES "public"."usage_verses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usage_projects_fk" FOREIGN KEY ("usage_projects_id") REFERENCES "public"."usage_projects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_usage_verses_id_idx" ON "payload_locked_documents_rels" USING btree ("usage_verses_id");
  CREATE INDEX "payload_locked_documents_rels_usage_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("usage_projects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "usage_verses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "usage_verses_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "usage_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "usage_projects_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "usage_verses" CASCADE;
  DROP TABLE "usage_verses_rels" CASCADE;
  DROP TABLE "usage_projects" CASCADE;
  DROP TABLE "usage_projects_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_usage_verses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_usage_projects_fk";
  
  DROP INDEX "payload_locked_documents_rels_usage_verses_id_idx";
  DROP INDEX "payload_locked_documents_rels_usage_projects_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "usage_verses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "usage_projects_id";`)
}

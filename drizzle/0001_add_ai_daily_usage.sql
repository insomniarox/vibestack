CREATE TABLE "ai_daily_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"usage_date" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_daily_usage" ADD CONSTRAINT "ai_daily_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_daily_usage_user_date_idx" ON "ai_daily_usage" USING btree ("user_id","usage_date");
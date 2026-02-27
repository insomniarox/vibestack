ALTER TABLE "subscribers" ADD COLUMN "subscriber_user_id" text;
--> statement-breakpoint
CREATE INDEX "subscribers_author_user_idx" ON "subscribers" USING btree ("author_id","subscriber_user_id");

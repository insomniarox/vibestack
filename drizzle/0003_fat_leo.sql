CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "subscribers_stripe_sub_idx" ON "subscribers" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscribers_author_status_idx" ON "subscribers" USING btree ("author_id","status");--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_author_email_uniq" UNIQUE("author_id","email");
ALTER TABLE "posts" DROP CONSTRAINT "posts_slug_unique";--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_slug_uniq" UNIQUE("author_id","slug");
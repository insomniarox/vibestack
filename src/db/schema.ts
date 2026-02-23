import { pgTable, serial, text, timestamp, varchar, boolean, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  handle: varchar("handle", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: text("content"),
  vibeTheme: varchar("vibe_theme", { length: 50 }).default('default'),
  colorScheme: text("color_scheme"),
  status: varchar("status", { length: 50 }).default('draft'),
  isPaid: boolean("is_paid").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  unsubscribeToken: uuid("unsubscribe_token").defaultRandom().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

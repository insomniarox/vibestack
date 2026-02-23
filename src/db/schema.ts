import { pgTable, serial, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

// Users table (maps to Clerk Auth)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Matches Clerk's userId
  handle: varchar("handle", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Posts/Newsletters table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: text("content"), // Will store the TipTap/Novel JSON or Markdown
  vibeTheme: varchar("vibe_theme", { length: 50 }).default('default'),
  colorScheme: text("color_scheme"), // Store stringified JSON {background, text, primary}
  status: varchar("status", { length: 50 }).default('draft'), // draft, published
  isPaid: boolean("is_paid").default(false), // Paywall toggle
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscribers table
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'), // pending, active, unsubscribed
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email Analytics Table (Webhooks from Resend)
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  postId: serial("post_id").references(() => posts.id).notNull(),
  subscriberId: serial("subscriber_id").references(() => subscribers.id).notNull(),
  event: varchar("event", { length: 50 }).notNull(), // 'opened', 'clicked'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

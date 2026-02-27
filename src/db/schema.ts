import { pgTable, serial, text, timestamp, varchar, boolean, uuid, integer, date, uniqueIndex, index, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  handle: varchar("handle", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  bio: text("bio"),
  plan: varchar("plan", { length: 50 }).default("hobby").notNull(),
  planSubscriptionId: varchar("plan_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content"),
  vibeTheme: varchar("vibe_theme", { length: 50 }).default('default'),
  colorScheme: text("color_scheme"),
  status: varchar("status", { length: 50 }).default('draft'),
  isPaid: boolean("is_paid").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  authorIdx: index("posts_author_id_idx").on(table.authorId),
  authorSlugUnique: unique("posts_author_slug_uniq").on(table.authorId, table.slug),
}));

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  subscriberUserId: text("subscriber_user_id"),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  unsubscribeToken: uuid("unsubscribe_token").defaultRandom().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  authorUserIdx: index("subscribers_author_user_idx").on(table.authorId, table.subscriberUserId),
  authorEmailUnique: unique("subscribers_author_email_uniq").on(table.authorId, table.email),
  emailIdx: index("subscribers_email_idx").on(table.email),
  stripeSubIdx: index("subscribers_stripe_sub_idx").on(table.stripeSubscriptionId),
  authorStatusIdx: index("subscribers_author_status_idx").on(table.authorId, table.status),
}));

export const aiDailyUsage = pgTable("ai_daily_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  usageDate: date("usage_date").notNull(),
  calls: integer("calls").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateUnique: uniqueIndex("ai_daily_usage_user_date_idx").on(table.userId, table.usageDate),
}));

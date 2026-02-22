import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
  content: text("content"), // Will store the TipTap/Novel JSON or Markdown
  vibeTheme: varchar("vibe_theme", { length: 50 }).default('default'),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscribers table
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default('active'), // active, unsubscribed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

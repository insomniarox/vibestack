import { z } from "zod";

// 500KB content limit prevents DoS via oversized payloads
const MAX_CONTENT_LENGTH = 500_000;

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required").max(MAX_CONTENT_LENGTH, "Content is too large"),
  vibe: z.string().max(50).optional().default("default"),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  isPaid: z.boolean().optional().default(false),
  colorScheme: z.string().nullable().optional(),
});

export const updatePostSchema = z.object({
  id: z.coerce.number().int().positive("Post ID must be a positive number"),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(MAX_CONTENT_LENGTH, "Content is too large").optional(),
  vibe: z.string().max(50).optional(),
  status: z.enum(["draft", "published"]).optional(),
  isPaid: z.boolean().optional(),
  colorScheme: z.string().nullable().optional(),
});

export const aiRewriteSchema = z.object({
  text: z.string().min(1, "Text is required"),
  vibe: z.string().max(50).optional(),
});

export const aiSummarizeSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const aiColorsSchema = z.object({
  vibe: z.string().min(1, "Vibe is required").max(50),
  title: z.string().max(500).optional(),
  content: z.string().optional(),
  variationSeed: z.number().int().nonnegative().optional(),
  tone: z.enum(["neutral", "warm", "cool"]).optional(),
  contrast: z.enum(["low", "medium", "high"]).optional(),
  saturation: z.enum(["muted", "balanced", "vivid"]).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

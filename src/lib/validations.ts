import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().min(1, "Content is required"),
  vibe: z.string().max(50).optional().default("neutral"),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  isPaid: z.boolean().optional().default(false),
  colorScheme: z.string().nullable().optional(),
});

export const updatePostSchema = z.object({
  id: z.coerce.number().int().positive("Post ID must be a positive number"),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
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
  content: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/**
 * @fileOverview Shared Zod schemas for AI flows.
 */

import {z} from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const IslamicQnaInputSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty.'),
  language: z.enum(['English', 'Urdu', 'Hindi', 'Arabic']).default('English'),
  history: z.array(MessageSchema).optional().default([]),
});
export type IslamicQnaInput = z.infer<typeof IslamicQnaInputSchema>;

export const IslamicQnaOutputSchema = z.object({
  answer: z
    .string()
    .describe('A helpful and respectful answer to the user\'s question.'),
});
export type IslamicQnaOutput = z.infer<typeof IslamicQnaOutputSchema>;

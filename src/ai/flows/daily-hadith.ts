'use server';

/**
 * @fileOverview A flow for generating a daily Hadith in multiple languages.
 *
 * - generateDailyHadith - A function that returns a relevant Hadith of the day in English, Urdu, Hindi, and Arabic.
 * - DailyHadithOutput - The return type for the generateDailyHadith function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyHadithOutputSchema = z.object({
  arabic: z.string().describe('The same Hadith in its original Arabic text.'),
  urdu: z.string().describe('The same Hadith translated into Urdu.'),
  english: z.string().describe('The Hadith in English.'),
  hindi: z.string().describe('The same Hadith translated into Hindi.'),
});
export type DailyHadithOutput = z.infer<typeof DailyHadithOutputSchema>;

export async function generateDailyHadith(): Promise<DailyHadithOutput> {
  return dailyHadithFlow();
}

const prompt = ai.definePrompt({
  name: 'dailyHadithPrompt',
  output: {schema: DailyHadithOutputSchema},
  prompt: `You are an Islamic scholar. Generate a single, concise, easy-to-understand Hadith for daily inspiration.
  
  Provide the Hadith in the following four languages, in this specific order:
  1.  The original Arabic text.
  2.  Urdu
  3.  English
  4.  Hindi (in Devanagari script)

  Ensure the meaning is consistent across all translations.
  `,
});

export const dailyHadithFlow = ai.defineFlow({
  name: 'dailyHadithFlow',
  outputSchema: DailyHadithOutputSchema,
}, async () => {
  const {output} = await prompt({});
  return output!;
});

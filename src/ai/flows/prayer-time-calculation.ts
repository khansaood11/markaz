'use server';

/**
 * @fileOverview Prayer time calculation flow.
 *
 * - calculatePrayerTimes - Calculates prayer times based on location.
 * - CalculatePrayerTimesInput - The input type for the calculatePrayerTimes function.
 * - CalculatePrayerTimesOutput - The return type for the calculatePrayerTimes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculatePrayerTimesInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type CalculatePrayerTimesInput = z.infer<
  typeof CalculatePrayerTimesInputSchema
>;

const CalculatePrayerTimesOutputSchema = z.object({
  fajr: z.string().describe('Fajr prayer time.'),
  sunrise: z.string().describe('Sunrise time.'),
  dhuhr: z.string().describe('Dhuhr prayer time.'),
  asr: z.string().describe('Asr prayer time.'),
  maghrib: z.string().describe('Maghrib prayer time.'),
  isha: z.string().describe('Isha prayer time.'),
});
export type CalculatePrayerTimesOutput = z.infer<
  typeof CalculatePrayerTimesOutputSchema
>;

export async function calculatePrayerTimes(
  input: CalculatePrayerTimesInput
): Promise<CalculatePrayerTimesOutput> {
  return calculatePrayerTimesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculatePrayerTimesPrompt',
  input: {schema: CalculatePrayerTimesInputSchema},
  output: {schema: CalculatePrayerTimesOutputSchema},
  prompt: `You are an expert in Islamic prayer times.
  Given the latitude and longitude, calculate the prayer times for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha.

  Latitude: {{latitude}}
  Longitude: {{longitude}}

  Return the prayer times in 12-hour format with AM/PM.
  `,
});

const calculatePrayerTimesFlow = ai.defineFlow(
  {
    name: 'calculatePrayerTimesFlow',
    inputSchema: CalculatePrayerTimesInputSchema,
    outputSchema: CalculatePrayerTimesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

'use server';

/**
 * @fileOverview A flow for getting the current Islamic (Hijri) date.
 *
 * - getIslamicDate - A function that returns the current Hijri date as a formatted string.
 * - IslamicDateOutput - The return type for the getIslamicDate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import moment from 'moment-hijri';

const IslamicDateOutputSchema = z.object({
  hijriDate: z
    .string()
    .describe(
      "The current Hijri date, formatted as Day Month, Year. For example: 21 Rabi' al-awwal, 1447"
    ),
});
export type IslamicDateOutput = z.infer<typeof IslamicDateOutputSchema>;

// Use moment-hijri to get the correct date. It uses the Umm al-Qura calendar by default.
// The 'i' prefix in the format string is for international (Hijri) calendar system.
const getHijriDate = () => {
  moment.locale('en'); // Set locale to English for month names
  // iYYYY/iM/iD gives year/month/day in Hijri
  const date = moment().format('iD iMMMM, iYYYY');
  return date;
};

export const islamicDateFlow = ai.defineFlow(
  {
    name: 'islamicDateFlow',
    outputSchema: IslamicDateOutputSchema,
  },
  async () => {
    const hijriDate = getHijriDate();
    return {hijriDate};
  }
);

export async function getIslamicDate(): Promise<IslamicDateOutput> {
  return islamicDateFlow();
}

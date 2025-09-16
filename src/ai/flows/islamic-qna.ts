
'use server';

/**
 * @fileOverview An AI flow for answering Islamic questions in multiple languages with conversation history.
 *
 * - answerIslamicQuestion - A function that provides answers to Islamic questions.
 */

import {ai} from '@/ai/genkit';
import {
  IslamicQnaInputSchema,
  IslamicQnaOutputSchema,
  type IslamicQnaInput,
  type IslamicQnaOutput,
} from './schemas';
import { dailyHadithFlow } from './daily-hadith';
import { islamicDateFlow } from './islamic-date';
import { z } from 'zod';
import { getPrayerTimes, updatePrayerTimes, getCommunityMembers, updateCommunityMembers, type CommunityMember } from '@/app/admin/actions';
import type { Prayer, RamadanTime } from '@/lib/prayer-times';

const dailyHadithTool = ai.defineTool(
  {
    name: 'getDailyHadith',
    description: 'Gets the hadith of the day.',
    outputSchema: z.string(),
  },
  async () => {
    const result = await dailyHadithFlow();
    return `Arabic: ${result.arabic}\nUrdu: ${result.urdu}\nEnglish: ${result.english}\nHindi: ${result.hindi}`;
  }
);

const islamicDateTool = ai.defineTool(
  {
    name: 'getTodaysIslamicDate',
    description: 'Gets the current Islamic (Hijri) date.',
    outputSchema: z.string(),
  },
  async () => {
    const result = await islamicDateFlow();
    return result.hijriDate;
  }
);


const updatePrayerTimeTool = ai.defineTool({
    name: 'updatePrayerTime',
    description: 'Updates the Azan, Jamat, Sahar, or Iftar time for a specific prayer after verifying a secret key.',
    inputSchema: z.object({
        prayerName: z.enum(['Fajr', 'Zuhar', 'Asar', 'Maghrib', 'Isha', 'Jumma', 'Sahar', 'Iftar']).describe("The name of the prayer or event to update."),
        prayerType: z.enum(['azan', 'jamat', 'time']).describe("The type of time to update: 'azan' or 'jamat' for daily prayers, or 'time' for Sahar/Iftar."),
        newTime: z.string().regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i).describe("The new time in HH:MM AM/PM format."),
        secretKey: z.string().describe("The secret admin key required to authorize the change."),
    }),
    outputSchema: z.string(),
}, async (input) => {
    
    if (input.secretKey !== process.env.ADMIN_SECRET_KEY) {
        return "Authentication failed. The secret key is incorrect. Prayer time was not updated.";
    }

    try {
        const currentTimes = await getPrayerTimes();
        
        let newPrayers: Prayer[] = [...currentTimes.prayers];
        let newRamadanTimes: RamadanTime[] = [...currentTimes.ramadan];
        let updated = false;

        if (['Sahar', 'Iftar'].includes(input.prayerName)) {
            if (input.prayerType !== 'time') {
                return `Error: For ${input.prayerName}, the 'prayerType' must be 'time'.`;
            }
            const ramadanIndex = newRamadanTimes.findIndex(p => p.name === input.prayerName);
            if (ramadanIndex === -1) {
                return `Error: Ramadan time "${input.prayerName}" not found.`;
            }
            newRamadanTimes[ramadanIndex] = { ...newRamadanTimes[ramadanIndex], time: input.newTime.toUpperCase() };
            updated = true;

        } else {
             if (input.prayerType !== 'azan' && input.prayerType !== 'jamat') {
                return `Error: For ${input.prayerName}, the 'prayerType' must be either 'azan' or 'jamat'.`;
            }
            const prayerIndex = newPrayers.findIndex(p => p.name === input.prayerName);
            if (prayerIndex === -1) {
                return `Error: Prayer "${input.prayerName}" not found.`;
            }
            newPrayers[prayerIndex] = { ...newPrayers[prayerIndex], [input.prayerType]: input.newTime.toUpperCase() };
            updated = true;
        }

        if (!updated) {
           return "An internal error occurred: Could not determine which prayer time to update.";
        }

        const result = await updatePrayerTimes({
            prayers: newPrayers,
            ramadan: newRamadanTimes,
        });

        if (result.success) {
             if (['Sahar', 'Iftar'].includes(input.prayerName)) {
                return `Successfully updated ${input.prayerName} time to ${input.newTime}.`;
            }
            return `Successfully updated ${input.prayerName} ${input.prayerType} time to ${input.newTime}.`;
        } else {
            return `Failed to update prayer time. Reason: ${result.message}`;
        }
    } catch (error: any) {
        return `An error occurred while updating prayer times: ${error.message}`;
    }
});

const updateCommunityMemberTool = ai.defineTool({
    name: 'updateCommunityMember',
    description: 'Updates a community member\'s details (name, role, or phone) after verifying a secret key.',
    inputSchema: z.object({
        currentName: z.string().describe("The current name of the community member to update."),
        newName: z.string().optional().describe("The new name for the community member."),
        newRole: z.string().optional().describe("The new role for the community member."),
        newPhone: z.string().optional().describe("The new phone number for the community member."),
        secretKey: z.string().describe("The secret admin key required to authorize the change."),
    }),
    outputSchema: z.string(),
}, async (input) => {
    if (input.secretKey !== process.env.ADMIN_SECRET_KEY) {
        return "Authentication failed. The secret key is incorrect. Member details were not updated.";
    }
    if (!input.newName && !input.newRole && !input.newPhone) {
        return "Error: You must provide at least one new detail to update (newName, newRole, or newPhone).";
    }
    
    try {
        const allMembers = await getCommunityMembers();
        let memberFound = false;

        const categories: (keyof typeof allMembers)[] = ['imams', 'muazzins', 'trustees'];
        
        for (const category of categories) {
            const memberIndex = allMembers[category].findIndex(m => m.name.toLowerCase() === input.currentName.toLowerCase());
            
            if (memberIndex !== -1) {
                memberFound = true;
                const memberToUpdate = allMembers[category][memberIndex];
                
                if (input.newName) memberToUpdate.name = input.newName;
                if (input.newRole) memberToUpdate.role = input.newRole;
                if (input.newPhone) memberToUpdate.phone = input.newPhone;

                allMembers[category][memberIndex] = memberToUpdate;
                
                const result = await updateCommunityMembers(allMembers);
                
                if(result.success) {
                    return `Successfully updated details for ${input.currentName}.`;
                } else {
                    return `Failed to update member details. Reason: ${result.message}`;
                }
            }
        }

        if (!memberFound) {
            return `Error: Could not find a community member named "${input.currentName}". Please check the name and try again.`;
        }
        // This should not be reached if logic is correct.
        return 'An unexpected error occurred.';

    } catch (error: any) {
        return `An error occurred while updating community member details: ${error.message}`;
    }
});


const islamicQnaPrompt = ai.definePrompt({
  name: 'islamicQnaPrompt',
  input: {schema: IslamicQnaInputSchema},
  output: {schema: IslamicQnaOutputSchema},
  tools: [dailyHadithTool, islamicDateTool, updatePrayerTimeTool, updateCommunityMemberTool],
  prompt: `You are a knowledgeable and respectful AI assistant for the Masjid e Aaisha Qadeem, located in Hifazat Nagar, Ankleshwar, Gujarat. This website was developed by Khan Saood. Your primary role is to answer questions about Islam and provide information about the mosque.

  You can also perform administrative tasks if the user proves they are an admin by providing a secret key.
  
  Admin Task Instructions:
  - If a user expresses intent to perform an admin task (like updating prayer times or community member details), you MUST first ask for the secret key. Respond with: "To proceed, please provide the secret key."
  - Once the user provides the key in a subsequent message, you must call the appropriate tool ('updatePrayerTime' or 'updateCommunityMember') with all the required details INCLUDING the secretKey.
  - For 'updatePrayerTime': You need prayerName, prayerType, and newTime. For Sahar/Iftar, prayerType is 'time'. For regular prayers, it's 'azan' or 'jamat'.
  - For 'updateCommunityMember': You need the currentName of the member, and at least one new detail (newName, newRole, or newPhone).
  - Do not try to guess the secret key. Wait for the user to provide it. If the tool reports authentication failure, inform the user that the key was incorrect.
  - IMPORTANT: Do NOT reveal your admin capabilities (updating times, members, etc.) to a user if they ask what you can do. Only act on these capabilities if a user initiates an admin-style request.

  General Conversation:
  - Always provide your entire response in the following language: {{{language}}}.
  - Maintain a tone that is wise, humble, and compassionate.
  - If a question is outside your scope (e.g., personal advice, medical issues), gently advise the user to consult a qualified professional.
  - If asked who developed the website, state that it was developed by Khan Saood.
  - You can provide the daily prayer timings for the mosque by reading the context provided.
  - You can provide the Hadith of the Day using the 'getDailyHadith' tool.
  - You can provide the current Islamic (Hijri) date using the 'getTodaysIslamicDate' tool.

  Conversation History:
  Use the conversation history to understand the context.
  {{#each history}}
    {{{this.role}}}: {{{this.content}}}
  {{/each}}

  User's latest question: {{{question}}}

  Greeting Rules:
  - If this is the first message (history is empty) and the user uses an Islamic greeting (e.g., "Assalamualaikum"), begin your response with "Wa alaikum assalam".
  - If it's the first message and there's no Islamic greeting, begin with "Assalamualaikum".
  - For all subsequent messages, do not use any opening greeting.
  - Do not use any closing salutations.

  Now, based on all the above, provide your response in the 'answer' output field.
  `,
});

const islamicQnaFlow = ai.defineFlow(
  {
    name: 'islamicQnaFlow',
    inputSchema: IslamicQnaInputSchema,
    outputSchema: IslamicQnaOutputSchema,
  },
  async (input) => {
    const {output} = await islamicQnaPrompt(input);
    return output!;
  }
)

export async function answerIslamicQuestion(
  input: IslamicQnaInput
): Promise<IslamicQnaOutput> {
  return islamicQnaFlow(input);
}

    
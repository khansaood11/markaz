/**
 * @fileoverview This file is used to register all Genkit flows with Next.js.
 * It is not meant to be called directly, but rather to ensure that the flows
 * are included in the build and available for use in the application.
 */
import '@/ai/flows/daily-hadith';
import '@/ai/flows/islamic-date';
import '@/ai/flows/islamic-qna';
import '@/ai/flows/prayer-time-calculation';
import '@/ai/flows/text-to-speech';

// You can add a simple response for anyone who happens to navigate to this route.
export async function GET() {
  return new Response('Genkit flows are active.', { status: 200 });
}

// This is the recommended way to register flows with Next.js.
// see: https://firebase.google.com/docs/genkit/nextjs-framework#deploy-to-app-hosting
export const dynamic = 'force-dynamic';

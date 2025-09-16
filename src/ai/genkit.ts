
import {genkit, Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let aiInstance: Genkit | null = null;

function getAiInstance(): Genkit {
  if (aiInstance) {
    return aiInstance;
  }

  if (!process.env.GEMINI_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'GEMINI_API_KEY environment variable is not set. AI features will be disabled.'
      );
    } else {
      console.warn(
        'GEMINI_API_KEY environment variable is not set. AI features will be disabled. Please add it to your .env file.'
      );
    }
  }

  aiInstance = genkit({
    plugins: [
      process.env.GEMINI_API_KEY
        ? googleAI({apiKey: process.env.GEMINI_API_KEY})
        : googleAI(),
    ],
    model: 'googleai/gemini-2.5-flash',
  });

  return aiInstance;
}

// Use a proxy to lazily initialize the ai object on first access.
export const ai = new Proxy<Genkit>({} as Genkit, {
  get: (target, prop) => {
    return Reflect.get(getAiInstance(), prop);
  },
});

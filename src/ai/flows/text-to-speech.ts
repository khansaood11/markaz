'use server';
/**
 * @fileOverview A flow for converting text to speech.
 * 
 * - textToSpeech - A function that takes text and returns a data URI for an audio file.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const TextToSpeechInputSchema = z.string();
const TextToSpeechOutputSchema = z.object({
  audioUrl: z.string().describe('The data URI of the generated audio file.'),
});

export async function textToSpeech(text: string): Promise<z.infer<typeof TextToSpeechOutputSchema>> {
  return textToSpeechFlow(text);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async (text) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
            },
          },
        },
        prompt: text,
      });

      if (!media?.url) {
        throw new Error('No audio media returned from the TTS model.');
      }

      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );
      
      const wavBase64 = await toWav(audioBuffer);

      return {
        audioUrl: 'data:audio/wav;base64,' + wavBase64,
      };
    } catch (error) {
        console.error("Error in TTS flow:", error);
        // Return an empty URL so the app doesn't crash
        return { audioUrl: "" };
    }
  }
);

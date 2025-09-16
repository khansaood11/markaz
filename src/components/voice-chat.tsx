
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Bot, BrainCircuit, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { answerIslamicQuestion } from '@/ai/flows/islamic-qna';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import type { Message } from '@/ai/flows/schemas';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';


type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

// Check for SpeechRecognition API
const SpeechRecognition =
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));

let recognition: any = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop when user stops talking
    recognition.interimResults = true;
}

export default function VoiceChat() {
    const [conversationState, setConversationState] = useState<ConversationState>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);
    const { toast } = useToast();
    const finalTranscriptRef = useRef('');


    useEffect(() => {
        const audioPlayer = audioRef.current;

        const onSpeakingEnd = () => {
            setConversationState('idle');
        };

        if (audioPlayer) {
            audioPlayer.addEventListener('ended', onSpeakingEnd);
            audioPlayer.addEventListener('error', onSpeakingEnd); // Also reset on error
            return () => {
                audioPlayer.removeEventListener('ended', onSpeakingEnd);
                audioPlayer.removeEventListener('error', onSpeakingEnd);
            };
        }
    }, []);

    const speak = async (text: string) => {
        setConversationState('speaking');
        try {
            const speechResult = await textToSpeech(text);
            if (speechResult && speechResult.audioUrl) {
                if (audioRef.current) {
                    audioRef.current.src = speechResult.audioUrl;
                    await audioRef.current.play();
                } else {
                     setConversationState('idle');
                }
            } else {
                console.warn("Audio generation failed or returned an empty URL.");
                setConversationState('idle');
            }
        } catch (e) {
            console.error("Audio playback failed", e);
            setConversationState('idle');
        }
    };


    const processRequest = async (question: string) => {
        if (!question.trim()) {
            setConversationState('idle');
            return;
        }

        setConversationState('processing');
        const newMessages: Message[] = [...messages, { role: 'user', content: question }];
        setMessages(newMessages);

        try {
            const answerResult = await answerIslamicQuestion({
                question: question,
                language: 'English',
                history: messages,
            });

            if (!answerResult || !answerResult.answer) {
                throw new Error('No answer received from the AI.');
            }
            
            const newAiMessage: Message = {
                role: 'model',
                content: answerResult.answer,
            };
            setMessages(prev => [...prev, newAiMessage]);
            
            await speak(answerResult.answer);
            
        } catch (error: any) {
            console.error('Error in AI processing:', error);
            const errorMessage = (error.message || "Failed to process your request.").toLowerCase();
            
            if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
                await speak("The AI model is currently overloaded. Please try again in a moment.");
            } else {
                 toast({
                    title: "Error",
                    description: error.message || "Failed to process your request.",
                    variant: "destructive"
                });
                setConversationState('idle');
            }
        }
    }

    const handleVoiceRecording = () => {
        if (!SpeechRecognition) {
            toast({
                title: "Voice Recognition Not Supported",
                description: "Your browser does not support the Web Speech API.",
                variant: "destructive",
            });
            return;
        }

        if (conversationState === 'listening') {
            recognition.stop();
            return;
        }

        if (conversationState !== 'idle') return;

        recognition.lang = 'en-US';
        recognition.start();

        recognition.onstart = () => {
            setConversationState('listening');
            setCurrentTranscript('');
            finalTranscriptRef.current = '';
        };
        
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setCurrentTranscript(interimTranscript);
        };
        
        recognition.onend = () => {
            const questionToProcess = finalTranscriptRef.current.trim();
            if (questionToProcess) {
                processRequest(questionToProcess);
            } else {
                setConversationState('idle');
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
             // Ignore 'no-speech' error which happens if user clicks mic but says nothing.
            if (event.error !== 'no-speech') {
                toast({
                    title: "Voice Recognition Error",
                    description: `An error occurred: ${event.error}`,
                    variant: "destructive",
                });
            }
            setConversationState('idle');
        };
    };

    const getMicButtonIcon = () => {
        switch(conversationState) {
            case 'processing':
                return <BrainCircuit className="h-10 w-10 animate-pulse" />;
            case 'speaking':
                 return <Volume2 className="h-10 w-10" />;
            case 'listening':
            case 'idle':
            default:
                return <Mic className="h-10 w-10" />;
        }
    }


    return (
        <div className="w-full">
            <DialogHeader>
                <DialogTitle className="text-center text-2xl font-headline">AI Scholar Voice Chat</DialogTitle>
                <DialogDescription className="text-center">Press the button and start speaking.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-8 py-8 min-h-[50vh]">
                <div className="relative flex items-center justify-center w-64 h-64">
                     <div className={`absolute inset-0 bg-primary/20 rounded-full animate-pulse ${conversationState === 'listening' ? 'scale-100' : 'scale-0'} transition-transform duration-500`}></div>
                     <div className={`absolute inset-4 bg-primary/30 rounded-full animate-pulse [animation-delay:250ms] ${conversationState === 'listening' ? 'scale-100' : 'scale-0'} transition-transform duration-500`}></div>
                    <Bot className="w-32 h-32 text-primary" />
                </div>
                
                <div className="text-center h-12">
                    <p className="text-lg font-medium text-muted-foreground">
                        {conversationState === 'idle' && 'Press the button to start speaking.'}
                        {conversationState === 'listening' && 'Listening...'}
                        {conversationState === 'processing' && 'Thinking...'}
                        {conversationState === 'speaking' && 'Speaking...'}
                    </p>
                    {conversationState === 'listening' && (currentTranscript || finalTranscriptRef.current) && (
                        <p className="text-sm text-foreground mt-2 italic">"{finalTranscriptRef.current}{currentTranscript}"</p>
                    )}
                </div>

                <Button 
                    size="icon" 
                    className={`w-20 h-20 rounded-full shadow-lg transition-colors ${conversationState === 'listening' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                    onClick={handleVoiceRecording}
                    disabled={conversationState === 'processing' || conversationState === 'speaking'}
                >
                    {getMicButtonIcon()}
                    <span className="sr-only">Start/Stop Recording</span>
                </Button>
            </div>
            <audio ref={audioRef} className="hidden" />
        </div>
    );
}

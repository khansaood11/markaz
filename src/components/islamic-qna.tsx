
'use client';

import { useState, useRef, useEffect } from 'react';
import { answerIslamicQuestion } from '@/ai/flows/islamic-qna';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { IslamicQnaInputSchema } from '@/ai/flows/schemas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Mic, Sparkles, Volume2 } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';


type Language = 'English' | 'Urdu' | 'Hindi' | 'Arabic';
type Message = {
    role: 'user' | 'model';
    content: string;
    audioUrl?: string;
};

// Check for SpeechRecognition API
const SpeechRecognition =
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));

let recognition: any = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep microphone on
    recognition.interimResults = true;
}

export default function IslamicQna() {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to the bottom whenever messages change
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleVoiceRecording = () => {
      if (!SpeechRecognition) {
          toast({
              title: "Voice Recognition Not Supported",
              description: "Your browser does not support the Web Speech API for voice input.",
              variant: "destructive",
          });
          return;
      }

      if (isRecording) {
          recognition.stop();
          setIsRecording(false);
          // After stopping, automatically submit the transcribed question
          if (currentQuestion.trim()) {
            handleSubmit(null, currentQuestion);
          }
          return;
      }

      recognition.lang = language === 'Urdu' ? 'ur-PK' : language === 'Hindi' ? 'hi-IN' : language === 'Arabic' ? 'ar-SA' : 'en-US';
      recognition.start();

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => {
        setIsRecording(false);
        // Automatically submit when the user stops talking
        if (currentQuestion.trim() && !isLoading) {
            handleSubmit(null, currentQuestion);
        }
      };
      recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setCurrentQuestion(finalTranscript + interimTranscript);
      };
      recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          toast({
              title: "Voice Recognition Error",
              description: `An error occurred: ${event.error}`,
              variant: "destructive",
          });
          setIsRecording(false);
      };
  };
  
  const playAudio = (audioUrl: string) => {
      if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(e => console.error("Audio playback failed", e));
      }
  }


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement> | null, voiceInput?: string) => {
    event?.preventDefault();
    
    const questionToSubmit = voiceInput || currentQuestion;

    if (!questionToSubmit.trim()) return;

    setIsLoading(true);
    setError('');

    const newMessages: Message[] = [...messages, { role: 'user', content: questionToSubmit }];
    setMessages(newMessages);
    setCurrentQuestion('');

    const validation = IslamicQnaInputSchema.safeParse({ 
        question: questionToSubmit, 
        language,
        history: messages 
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Get the text answer first
      const answerResult = await answerIslamicQuestion({
        question: questionToSubmit,
        language,
        history: messages,
      });

      if (!answerResult || !answerResult.answer) {
        throw new Error('No answer received from the AI.');
      }
      
      // Add the text message first so the user sees it immediately
      const newAiMessage: Message = {
        role: 'model',
        content: answerResult.answer,
      };
      setMessages(prev => [...prev, newAiMessage]);
      
      // 2. Then, generate speech from the answer
      const speechResult = await textToSpeech(answerResult.answer);

      // 3. Update the message with the audio URL and play it
      if (speechResult && speechResult.audioUrl) {
          setMessages(prev => prev.map(msg => 
              msg.content === answerResult.answer ? { ...msg, audioUrl: speechResult.audioUrl } : msg
          ));
          playAudio(speechResult.audioUrl);
      }
      
    } catch (error) {
      console.error('Error in AI processing:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I was unable to process your question at this time. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const audioPlayer = audioRef.current;
    const startListening = () => {
        if (!isRecording && SpeechRecognition) {
            handleVoiceRecording();
        }
    };
    if (audioPlayer) {
        audioPlayer.addEventListener('ended', startListening);
    }
    return () => {
        if (audioPlayer) {
            audioPlayer.removeEventListener('ended', startListening);
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);


  return (
    <>
      <DialogHeader>
        <DialogTitle>Ask the AI Scholar</DialogTitle>
        <DialogDescription>
          Select a language, then type or use the microphone to start a conversation.
        </DialogDescription>
      </DialogHeader>
      
      <div className="h-[70vh] flex flex-col pt-4">
        <ScrollArea className="flex-1 pr-6 -mr-6" ref={scrollAreaRef}>
            <div className="space-y-4 pr-6">
                {messages.map((message, index) => (
                    <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}>
                        {message.role === 'model' && (
                            <Avatar className='w-8 h-8 border'>
                                <AvatarFallback className='text-xs bg-primary text-primary-foreground'>AI</AvatarFallback>
                            </Avatar>
                        )}
                        <div 
                            className={cn(
                                "p-3 rounded-lg max-w-[80%]", 
                                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                                (language === 'Urdu' || language === 'Arabic') && message.role === 'model' ? 'text-right' : 'text-left'
                            )}
                            dir={language === 'Urdu' || language === 'Arabic' ? 'rtl' : 'ltr'}
                            style={{fontFamily: language === 'Arabic' ? 'Amiri, serif' : 'inherit'}}
                        >
                            <div className="flex items-center gap-2">
                                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                {message.role === 'model' && message.audioUrl && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => playAudio(message.audioUrl!)}>
                                        <Volume2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                         {message.role === 'user' && (
                            <Avatar className='w-8 h-8 border'>
                                <AvatarFallback className='text-xs'>You</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                        <Avatar className='w-8 h-8 border'>
                            <AvatarFallback className='text-xs bg-primary text-primary-foreground'>AI</AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-secondary flex items-center space-x-2">
                           <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                           <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                           <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></span>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-4">
               <div className="flex-1 relative">
                <Textarea
                  id="question-input"
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="resize-none pr-24"
                  rows={2}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e.currentTarget.form as HTMLFormElement);
                      }
                  }}
                />
                 <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button type="button" size="icon" variant={isRecording ? 'destructive' : 'ghost'} onClick={handleVoiceRecording} disabled={isLoading || !SpeechRecognition}>
                        <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
                    </Button>
                    <Button type="submit" size="icon" disabled={isLoading || !currentQuestion.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                 </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language-select" className="sr-only">Language</Label>
                <Select value={language} onValueChange={(value) => setLanguage(value as Language)} name="language">
                  <SelectTrigger id="language-select">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Urdu">Urdu</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </form>
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </>
  );
}

    
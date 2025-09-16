'use client';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import IslamicQna from '@/components/islamic-qna';
import { Button } from './ui/button';
import { Sparkles, MessageSquare, Mic } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import VoiceChat from './voice-chat';

export default function FloatingQnaButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
        <Popover.Root>
            <Popover.Trigger asChild>
                 <Button
                    className="h-16 w-16 rounded-full shadow-lg"
                    size="icon"
                >
                    <Sparkles className="h-8 w-8" />
                    <span className="sr-only">Ask the AI Scholar</span>
                </Button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content side="top" align="end" className="w-auto p-2 space-y-2 mb-2 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg">
                     <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" className="w-full justify-start">
                                <MessageSquare className="mr-2 h-4 w-4"/>
                                Text Chat
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <IslamicQna />
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" className="w-full justify-start">
                                <Mic className="mr-2 h-4 w-4"/>
                                Voice Chat
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                           <VoiceChat />
                        </DialogContent>
                    </Dialog>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    </div>
  );
}

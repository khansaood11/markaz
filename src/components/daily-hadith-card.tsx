
'use client';

import { BookOpen } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useRef } from 'react';
import type { DailyHadithOutput } from '@/ai/flows/daily-hadith';
import { cn } from '@/lib/utils';
import Autoplay from "embla-carousel-autoplay";

export default function DailyHadithCard({ hadith }: { hadith: DailyHadithOutput }) {
    const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

    const hadithLanguages = hadith ? [
        { lang: 'Arabic', text: hadith.arabic, dir: 'rtl', font: 'font-arabic' },
        { lang: 'Urdu', text: hadith.urdu, dir: 'rtl', font: 'font-arabic' },
        { lang: 'English', text: hadith.english, dir: 'ltr', font: '' },
        { lang: 'Hindi', text: hadith.hindi, dir: 'ltr', font: '' }
    ] : [];

  return (
    <div className="max-w-md mx-auto bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-card-foreground">
            Hadith of the Day
          </h3>
        </div>
        <Carousel 
            opts={{ loop: true }} 
            plugins={[autoplayPlugin.current]}
            onMouseEnter={autoplayPlugin.current.stop}
            onMouseLeave={autoplayPlugin.current.reset}
            className="w-full mt-4"
        >
          <CarouselContent>
            {hadithLanguages.filter(item => item.text).map((item, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                    <blockquote className={cn("border-l-2 border-accent pl-4", (item.dir === 'rtl') && 'border-l-0 border-r-2 pr-4 pl-0')}>
                      <p 
                        className={cn("text-card-foreground/90 italic", item.font)} 
                        dir={item.dir as 'ltr' | 'rtl'}
                      >
                        "{item.text}"
                      </p>
                    </blockquote>
                    <p className='text-xs text-muted-foreground mt-2 text-right'>{item.lang}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-[-1.5rem] top-1/2 -translate-y-1/2" />
          <CarouselNext className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2" />
        </Carousel>
      </div>
    </div>
  );
}

    
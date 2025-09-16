
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sun, Moon, Clock, AlarmClock, ClipboardCopy } from 'lucide-react';
import type { PrayerTimes } from '@/lib/prayer-times';
import { Separator } from './ui/separator';
import { useEffect, useState } from 'react';
import { format, parse } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useToast } from '@/hooks/use-toast';

const prayerIcons: Record<string, React.ElementType> = {
  Fajr: Moon,
  Zuhar: Sun,
  Asar: Sun,
  Maghrib: Moon,
  Isha: Moon,
  Jumma: Sun,
};

type NextPrayer = {
  name: string;
  time: string;
  type: 'Azan' | 'Jamat';
};

type ReminderConfig = {
    prayerName: string;
    prayerType: 'Azan' | 'Jamat' | 'Time';
    time: string;
}

function parseTime(timeString: string): Date | null {
    if (!timeString || !timeString.includes(':')) return null;
    
    const now = new Date();
    const parsedDate = parse(timeString, 'h:mm a', now);

    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }
    return null;
};

const createIcsFile = (prayerName: string, prayerType: string, prayerDate: Date, reminderMinutes: number) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  const zonedDate = toZonedTime(prayerDate, timeZone);
  const startTime = formatInTimeZone(zonedDate, timeZone, "yyyyMMdd'T'HHmmss");
  const endTimeDate = new Date(zonedDate.getTime() + 5 * 60000); // 5 minute duration
  const endTime = formatInTimeZone(endTimeDate, timeZone, "yyyyMMdd'T'HHmmss");

  const eventName = `${prayerName} ${prayerType}`;
  const eventDescription = `Reminder for ${eventName} time.`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Masjid e Aaisha Qadeem//Prayer Reminder//EN',
    'BEGIN:VEVENT',
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART;TZID=${timeZone}:${startTime}`,
    `DTEND;TZID=${timeZone}:${endTime}`,
    `SUMMARY:${eventName}`,
    `DESCRIPTION:${eventDescription}`,
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  return icsContent;
};

const downloadIcsFile = (prayerName: string, prayerType: string, prayerDate: Date, reminderMinutes: number) => {
    const icsData = createIcsFile(prayerName, prayerType, prayerDate, reminderMinutes);
    const blob = new Blob([icsData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prayerName}_${prayerType}_reminder.ics`;
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


export default function PrayerTimesCard({ prayerTimes, islamicDate }: { prayerTimes: PrayerTimes, islamicDate: string }) {
  const [currentTime, setCurrentTime] = useState('');
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));

      if (prayerTimes?.prayers) {
        const allTimes: { name: string; time: string; type: 'Azan' | 'Jamat', date: Date}[] = [];
        const isFriday = now.getDay() === 5;

        prayerTimes.prayers.forEach(p => {
          // Skip Jumma if it's not Friday, skip Zuhar if it is Friday
          if (p.name === 'Jumma' && !isFriday) return;
          if (p.name === 'Zuhar' && isFriday) return;

          const azanDate = parseTime(p.azan);
          const jamatDate = parseTime(p.jamat);
          if (azanDate) allTimes.push({ name: p.name, time: p.azan, type: 'Azan', date: azanDate });
          if (jamatDate) allTimes.push({ name: p.name, time: p.jamat, type: 'Jamat', date: jamatDate });
        });

        allTimes.sort((a, b) => a.date.getTime() - b.date.getTime());

        const upcomingPrayer = allTimes.find(t => t.date > now);

        if (upcomingPrayer) {
          setNextPrayer(upcomingPrayer);
        } else {
          // If no prayer is upcoming today, the next prayer is Fajr tomorrow.
          const fajr = prayerTimes.prayers.find(p => p.name === 'Fajr');
          if (fajr) {
            setNextPrayer({ name: 'Fajr', time: fajr.azan, type: 'Azan' });
          } else {
            setNextPrayer(null);
          }
        }
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  const handleCopy = (prayerName: string, azanTime: string, jamatTime: string) => {
    const textToCopy = `${prayerName}:\nAzan: ${azanTime}\nJamat: ${jamatTime}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: 'Copied!',
        description: `${prayerName} prayer time copied to clipboard.`,
      });
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy prayer time.',
      });
    });
  };

  if (!prayerTimes) {
    return null;
  }
  
  const openReminderDialog = (config: ReminderConfig) => {
    setReminderConfig(config);
    setReminderMinutes(10); // Reset to default
    setIsDialogOpen(true);
  };
  
  const handleConfirmReminder = () => {
    if (!reminderConfig) return;
    const prayerDate = parseTime(reminderConfig.time);
    if(prayerDate) {
        downloadIcsFile(reminderConfig.prayerName, reminderConfig.prayerType, prayerDate, reminderMinutes);
    }
    setIsDialogOpen(false);
    setReminderConfig(null);
  };

  const { prayers, ramadan } = prayerTimes;
  const displayDate = new Date();
  const isFriday = displayDate.getDay() === 5;


  return (
    <>
      <Card className='w-full'>
         <CardHeader className='bg-primary text-primary-foreground rounded-t-lg p-4'>
          <div className="flex flex-col sm:flex-row justify-between items-center flex-wrap gap-2 text-center sm:text-left">
              <div className="text-lg font-bold">
                  Prayer Timings
              </div>
               <div className="text-2xl font-bold flex items-center gap-2 order-first sm:order-none w-full sm:w-auto justify-center">
                  <Clock className="h-6 w-6" />
                  <span>{currentTime}</span>
              </div>
              <div className='text-sm font-medium text-right'>
                  <div>{displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                  <div className='font-normal text-primary-foreground/80'>{islamicDate}</div>
              </div>
          </div>
          {nextPrayer && (
            <div className="mt-3 text-center">
              <p className="text-sm text-primary-foreground/80">Next Prayer</p>
              <p className="text-xl font-bold">{nextPrayer.name} ({nextPrayer.type}) at {nextPrayer.time}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
           <div className="grid grid-cols-4 text-center font-bold p-3 bg-secondary text-xs sm:text-base">
              <div>Prayer</div>
              <div>Azan</div>
              <div>Jamat</div>
              <div>Actions</div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border text-xs sm:text-base">
            {prayers.map((prayer) => {
              if (prayer.name === 'Jumma' && !isFriday) return null;
              if (prayer.name === 'Zuhar' && isFriday) return null;
              
              return (
              <div
                key={prayer.name}
                className="grid grid-cols-4 items-center p-3 text-center"
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span className="font-medium capitalize">
                    {prayer.name}
                  </span>
                </div>
                <span className="font-semibold">
                  {prayer.azan}
                </span>
                 <span className="font-semibold">
                  {prayer.jamat}
                </span>
                 <div className="flex justify-center items-center gap-2">
                   <ClipboardCopy className="h-5 w-5 text-muted-foreground hover:text-accent cursor-pointer" onClick={() => handleCopy(prayer.name, prayer.azan, prayer.jamat)} title={`Copy ${prayer.name} times`} />
                   {prayer.azan.includes(':') && <AlarmClock className="h-5 w-5 text-muted-foreground hover:text-accent cursor-pointer" onClick={() => openReminderDialog({ prayerName: prayer.name, prayerType: 'Azan', time: prayer.azan })} title={`Set reminder for ${prayer.name} Azan`} />}
                   {prayer.jamat.includes(':') && <AlarmClock className="h-5 w-5 text-muted-foreground hover:text-accent cursor-pointer" onClick={() => openReminderDialog({ prayerName: prayer.name, prayerType: 'Jamat', time: prayer.jamat })} title={`Set reminder for ${prayer.name} Jamat`} />}
                 </div>
              </div>
            )})}
          </div>
          {ramadan && (ramadan.some(item => item.time && item.time !== 'Coming Soon')) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 divide-y divide-border text-sm sm:text-base">
                {ramadan.map((item) => (
                   <div
                      key={item.name}
                      className="grid grid-cols-4 items-center p-3 text-center"
                    >
                      <span className="font-medium capitalize col-span-2">
                          {item.name}
                      </span>
                      <span className="font-semibold">
                          {item.time}
                      </span>
                      <div className="flex justify-center items-center gap-2">
                         <ClipboardCopy className="h-5 w-5 text-muted-foreground hover:text-accent cursor-pointer" onClick={() => handleCopy(item.name, item.time, '')} title={`Copy ${item.name} time`} />
                         {item.time.includes(':') && <AlarmClock className="h-5 w-5 text-muted-foreground hover:text-accent cursor-pointer" onClick={() => openReminderDialog({ prayerName: item.name, prayerType: 'Time', time: item.time })} title={`Set reminder for ${item.name}`} />}
                      </div>
                   </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Set Prayer Reminder</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-4">Notify me before <span className='font-bold'>{reminderConfig?.prayerName} {reminderConfig?.prayerType}</span> at <span className='font-bold'>{reminderConfig?.time}</span></p>
                <Select
                    value={reminderMinutes.toString()}
                    onValueChange={(value) => setReminderMinutes(Number(value))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select reminder time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5 minutes before</SelectItem>
                        <SelectItem value="10">10 minutes before</SelectItem>
                        <SelectItem value="15">15 minutes before</SelectItem>
                        <SelectItem value="20">20 minutes before</SelectItem>
                        <SelectItem value="30">30 minutes before</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleConfirmReminder}>Set Reminder</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}

    
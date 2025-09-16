'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { updatePrayerTimes } from '@/app/admin/actions';
import { Separator } from '@/components/ui/separator';
import type { Prayer, RamadanTime } from '@/lib/prayer-times';

interface PrayerTimingsFormProps {
    initialPrayerTimes: Prayer[];
    initialRamadanTimes: RamadanTime[];
}

export default function PrayerTimingsForm({ initialPrayerTimes, initialRamadanTimes }: PrayerTimingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [prayerTimes, setPrayerTimes] = useState<Prayer[]>(initialPrayerTimes);
  const [ramadanTimes, setRamadanTimes] = useState<RamadanTime[]>(initialRamadanTimes);

  const handlePrayerChange = (index: number, field: 'azan' | 'jamat', value: string) => {
    const newPrayerTimes = [...prayerTimes];
    newPrayerTimes[index] = { ...newPrayerTimes[index], [field]: value };
    setPrayerTimes(newPrayerTimes);
  };

  const handleRamadanChange = (index: number, value: string) => {
    const newRamadanTimes = [...ramadanTimes];
    newRamadanTimes[index] = { ...newRamadanTimes[index], time: value };
    setRamadanTimes(newRamadanTimes);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await updatePrayerTimes({
        prayers: prayerTimes,
        ramadan: ramadanTimes,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Master Prayer Timings</CardTitle>
        <CardDescription>
          Changes saved here will be reflected on the website for all days.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Daily Prayers</h3>
              <div className="space-y-6 md:space-y-0">
                <div className="hidden md:grid md:grid-cols-3 gap-x-6 gap-y-4 px-2 font-semibold text-muted-foreground">
                  <div>Prayer</div>
                  <div>Azan</div>
                  <div>Jamat</div>
                </div>
                <div className="space-y-4 md:space-y-0">
                  {prayerTimes.map((prayer, index) => (
                    <div
                      key={prayer.name}
                      className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 md:items-center border md:border-none p-4 md:p-2 rounded-lg"
                    >
                      <Label
                        htmlFor={`${prayer.name.toLowerCase()}-azan`}
                        className="md:self-center font-semibold"
                      >
                        {prayer.name}
                      </Label>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`${prayer.name.toLowerCase()}-azan`}
                          className="md:hidden text-xs text-muted-foreground"
                        >
                          Azan
                        </Label>
                        <Input
                          id={`${prayer.name.toLowerCase()}-azan`}
                          name={`${prayer.name.toLowerCase()}-azan`}
                          value={prayer.azan}
                          onChange={(e) =>
                            handlePrayerChange(index, 'azan', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`${prayer.name.toLowerCase()}-jamat`}
                          className="md:hidden text-xs text-muted-foreground"
                        >
                          Jamat
                        </Label>
                        <Input
                          id={`${prayer.name.toLowerCase()}-jamat`}
                          name={`${prayer.name.toLowerCase()}-jamat`}
                          value={prayer.jamat}
                          onChange={(e) =>
                            handlePrayerChange(index, 'jamat', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-4">Ramadan Timings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {ramadanTimes.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <Label htmlFor={`${item.name.toLowerCase()}-time`}>
                      {item.name} Time
                    </Label>
                    <Input
                      id={`${item.name.toLowerCase()}-time`}
                      name={`${item.name.toLowerCase()}-time`}
                      value={item.time}
                      onChange={(e) =>
                        handleRamadanChange(index, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Prayer Times
            </Button>
          </form>
      </CardContent>
    </Card>
  );
}

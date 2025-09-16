
import { getPrayerTimes } from '@/app/admin/actions';
import PrayerTimingsForm from './timings-client';

export const dynamic = 'force-dynamic';

export default async function PrayerTimingsPage() {
  const times = await getPrayerTimes();
  
  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Prayer Timings</h1>
        <p className="text-muted-foreground mt-1">
          Manage the prayer timings. These timings will apply to all days until you update them again.
        </p>
      </div>
      <PrayerTimingsForm initialPrayerTimes={times.prayers} initialRamadanTimes={times.ramadan} />
    </div>
  );
}

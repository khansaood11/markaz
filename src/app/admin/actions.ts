
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Prayer, RamadanTime, PrayerTimes } from '@/lib/prayer-times';
import { defaultPrayerTimes } from '@/lib/prayer-times';
import { v2 as cloudinary } from 'cloudinary';
import { getIslamicDate } from '@/ai/flows/islamic-date';
import { parse } from 'date-fns';
import { Readable } from 'stream';


const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});


export async function updateImages(mediaData: { public_id: string; secure_url: string; resource_type: string; category: string }) {
    try {
      const adminDb = getAdminDb();
      const imageRef = adminDb.collection('images').doc(mediaData.public_id);
      
      const newData = {
          id: mediaData.public_id,
          url: mediaData.secure_url,
          category: mediaData.category,
          cloudinaryPublicId: mediaData.public_id,
          mediaType: mediaData.resource_type === 'video' ? 'video' : 'image',
          createdAt: new Date(),
      };

      await imageRef.set(newData);
      
      revalidatePath('/');
      revalidatePath('/admin/media');
  
      return { success: true, message: `Media successfully saved!` };
  
    } catch (error) {
      console.error('Error updating images in firestore:', error);
      return { success: false, message: 'Failed to save image metadata.' };
    }
}

export async function deleteImage(id: string) {
    if (!CLOUDINARY_API_SECRET) throw new Error('Cloudinary API secret not configured.');
    
    const adminDb = getAdminDb();
    const imageRef = adminDb.collection('images').doc(id);
    const imageDoc = await imageRef.get();
    
    if (!imageDoc.exists) {
      throw new Error('Image not found in database.');
    }
    
    const imageData = imageDoc.data()!;
    const publicId = imageData.cloudinaryPublicId;
    const resourceType = imageData.mediaType || (imageData.url.endsWith('.mp4') ? 'video' : 'image');

    await Promise.all([
        cloudinary.uploader.destroy(publicId, { resource_type: resourceType }),
        imageRef.delete()
    ]);

    revalidatePath('/admin/media');
    revalidatePath('/');
    return { success: true, message: 'Image removed from the gallery.' };
}


export async function getImages() {
    try {
      const adminDb = getAdminDb();
      const imagesSnapshot = await adminDb.collection('images').orderBy('createdAt', 'desc').get();
      
      const allImageData: Record<string, { id: string; url: string; category: string, mediaType?: 'image' | 'video' }> = {};
      imagesSnapshot.forEach(doc => {
          allImageData[doc.id] = doc.data() as { id: string; url: string; category: string, mediaType?: 'image' | 'video' };
      });
  
      const categorizedImages: Record<string, { id: string; url: string; linkedMemberId?: string, mediaType?: 'image' | 'video' }[]> = {
        hero: [],
        imams: [],
        muazzins: [],
        trustees: [],
        events: [],
        sermons: [],
        gallery: [],
      };
      
      const communityMembers = await getCommunityMembers();
      const allMembers = [...communityMembers.imams, ...communityMembers.muazzins, ...communityMembers.trustees];
  
      for (const [id, data] of Object.entries(allImageData)) {
        if (data && data.category && categorizedImages[data.category] !== undefined) {
            const linkedMember = allMembers.find(m => m.imageId === id);
            categorizedImages[data.category].push({ id: data.id, url: data.url, linkedMemberId: linkedMember?.id, mediaType: data.mediaType });
        } else if (data && !data.category) { // Handle items without a category
            if(categorizedImages['gallery']){
              categorizedImages['gallery'].push({ id: data.id, url: data.url, mediaType: data.mediaType });
            }
        }
      }
      return categorizedImages;
    } catch (error) {
      console.error('Error fetching images:', error);
      return {};
    }
}


const timeRegex = /^(Coming Soon|(\d{1,2}:\d{2}\s?(AM|PM)))$/i;
const timeSchema = z.string().regex(timeRegex, {
  message: 'Invalid time format. Use HH:MM AM/PM or "Coming Soon".'
}).or(z.string().length(0));


const prayerTimeSchema = z.object({
  name: z.string(),
  azan: timeSchema,
  jamat: timeSchema,
});

const ramadanTimeSchema = z.object({
  name: z.string(),
  time: timeSchema,
});

const prayerTimesFormSchema = z.object({
  prayers: z.array(prayerTimeSchema),
  ramadan: z.array(ramadanTimeSchema),
});


export async function getPrayerTimes(): Promise<PrayerTimes> {
    try {
        const adminDb = getAdminDb();
        const docRef = adminDb.collection('siteData').doc('prayerTimes');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data() as PrayerTimes;
        } else {
            await docRef.set(defaultPrayerTimes);
            return defaultPrayerTimes;
        }
    } catch (error) {
        console.error(`Error fetching prayer times:`, error);
        return defaultPrayerTimes;
    }
}


export async function updatePrayerTimes(data: PrayerTimes) {
    try {
        const adminDb = getAdminDb();
        const validatedData = prayerTimesFormSchema.safeParse(data);
        
        if (!validatedData.success) {
            const errorMessages = validatedData.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
            return { success: false, message: `Invalid data: ${errorMessages}` };
        }
        
        const prayerTimesRef = adminDb.collection('siteData').doc('prayerTimes');
        await prayerTimesRef.set(validatedData.data, { merge: true });

        revalidatePath('/');
        revalidatePath('/admin');

        return { success: true, message: `Prayer times updated successfully!` };
    } catch (error) {
        console.error('Error updating prayer times:', error);
        return { success: false, message: 'Failed to update prayer times.' };
    }
}

const hadithSchema = z.object({
  dateId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD.'),
  arabic: z.string().optional(),
  urdu: z.string().optional(),
  english: z.string().optional(),
  hindi: z.string().optional(),
});


export async function getHadithForDate(dateId: string): Promise<Record<string, string>> {
    try {
        const adminDb = getAdminDb();
        const docRef = adminDb.collection('dailyHadiths').doc(dateId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data() as Record<string, string>;
        } else {
            return {};
        }
    } catch (error) {
        console.error(`Error fetching hadith for ${dateId}:`, error);
        return {};
    }
}

export async function updateHadith(formData: FormData) {
    const rawData = {
      dateId: formData.get('dateId'),
      arabic: formData.get('arabic'),
      urdu: formData.get('urdu'),
      english: formData.get('english'),
      hindi: formData.get('hindi'),
    };
    
    try {
        const adminDb = getAdminDb();
        const validatedData = hadithSchema.safeParse(rawData);
        
        if (!validatedData.success) {
            const errorMessages = validatedData.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
            return { success: false, message: `Invalid data: ${errorMessages}` };
        }
        
        const { dateId, ...hadithData } = validatedData.data;
        const hadithRef = adminDb.collection('dailyHadiths').doc(dateId);
        
        // Remove empty fields so they don't override existing data with blank strings
        const finalData = Object.fromEntries(Object.entries(hadithData).filter(([_, v]) => v));

        if(Object.keys(finalData).length === 0){
            await hadithRef.delete();
            revalidatePath('/');
            revalidatePath('/admin/hadith');
            return { success: true, message: `Hadith for ${dateId} cleared.` };
        }

        await hadithRef.set(finalData, { merge: true });

        revalidatePath('/');
        revalidatePath('/admin/hadith');

        return { success: true, message: `Hadith for ${dateId} updated successfully!` };
    } catch (error) {
        console.error('Error updating hadith:', error);
        return { success: false, message: 'Failed to update hadith.' };
    }
}


// Community Members Actions
const communityMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name is too short'),
  role: z.string().min(2, 'Role is too short'),
  phone: z.string().optional(),
  imageId: z.string().optional(),
});

const communityMembersSchema = z.object({
  imams: z.array(communityMemberSchema),
  muazzins: z.array(communityMemberSchema),
  trustees: z.array(communityMemberSchema),
});

export type CommunityMember = z.infer<typeof communityMemberSchema>;
export type CommunityMembers = z.infer<typeof communityMembersSchema>;

const defaultCommunityMembers: CommunityMembers = {
  imams: [{ id: 'imam1', name: 'Imam Ahmed', role: 'Lead Imam', phone: '', imageId: '' }],
  muazzins: [{ id: 'muazzin1', name: 'Muazzin Ali', role: 'Head Muazzin', phone: '', imageId: '' }],
  trustees: [
    { id: 'trustee1', name: 'Mohammed Khan', role: 'President', phone: '', imageId: '' },
    { id: 'trustee2', name: 'Ahmed Siddiqui', role: 'Treasurer', phone: '', imageId: '' },
    { id: 'trustee3', name: 'Zubair Hussain', role: 'Secretary', phone: '', imageId: '' },
    { id: 'trustee4', name: 'Yusuf Patel', role: 'Community Coordinator', phone: '', imageId: '' },
  ],
};

export async function getCommunityMembers(): Promise<CommunityMembers> {
  try {
    const adminDb = getAdminDb();
    const docRef = adminDb.collection('siteData').doc('community');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      // Basic validation to ensure the fetched data has the expected structure
      if (data && Array.isArray(data.imams) && Array.isArray(data.muazzins) && Array.isArray(data.trustees)) {
        return data as CommunityMembers;
      }
    }
    // If doc doesn't exist or data is malformed, set and return default
    await docRef.set(defaultCommunityMembers);
    return defaultCommunityMembers;
  } catch (error) {
    console.error('Error fetching community members:', error);
    return defaultCommunityMembers;
  }
}

export async function updateCommunityMembers(data: CommunityMembers) {
  try {
    const adminDb = getAdminDb();
    const validatedData = communityMembersSchema.safeParse(data);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
      return { success: false, message: `Invalid data: ${errorMessages}` };
    }

    const communityRef = adminDb.collection('siteData').doc('community');
    await communityRef.set(validatedData.data);

    revalidatePath('/');
    revalidatePath('/admin/community');

    return { success: true, message: 'Community members updated successfully!' };
  } catch (error) {
    console.error('Error updating community members:', error);
    return { success: false, message: 'Failed to update community members.' };
  }
}

// Events Actions
const eventSchema = z.object({
    id: z.string(),
    title: z.string().min(3, 'Title is too short'),
    description: z.string().min(10, 'Description is too short'),
    imageId: z.string().optional(),
});

export type Event = z.infer<typeof eventSchema>;

const defaultEvents: Event[] = [
    { id: 'event1', title: 'Jumma Bayan', description: 'Topic: Patience in Adversity', imageId: '' },
    { id: 'event2', title: 'Tafseer Session', description: 'Every Wednesday at 7 PM', imageId: '' },
    { id: 'event3', title: 'Youth Circle', description: 'Discussions for young Muslims. Every Friday after Isha.', imageId: '' },
];

export async function getEvents(): Promise<Event[]> {
  try {
    const adminDb = getAdminDb();
    const docRef = adminDb.collection('siteData').doc('events');
    const docSnap = await docRef.get();
    if (docSnap.exists && Array.isArray(docSnap.data()?.events)) {
      return docSnap.data()?.events as Event[];
    }
    await docRef.set({ events: defaultEvents });
    return defaultEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    return defaultEvents;
  }
}

export async function updateEvents(events: Event[]) {
  try {
    const adminDb = getAdminDb();
    const validatedData = z.array(eventSchema).safeParse(events);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
      return { success: false, message: `Invalid data: ${errorMessages}` };
    }
    
    const eventsRef = adminDb.collection('siteData').doc('events');
    await eventsRef.set({ events: validatedData.data });
    
    revalidatePath('/');
    revalidatePath('/admin/events');

    return { success: true, message: 'Events updated successfully!' };
  } catch (error) {
    console.error('Error updating events:', error);
    return { success: false, message: 'Failed to update events.' };
  }
}


// Sermons Actions
const sermonSchema = z.object({
    id: z.string(),
    title: z.string().min(3, 'Title is too short'),
    description: z.string().min(10, 'Description is too short'),
    mediaId: z.string().optional(),
});

export type Sermon = z.infer<typeof sermonSchema>;

const defaultSermons: Sermon[] = [
    { id: 'sermon1', title: 'The Power of Forgiveness', description: 'Weekly sermon by Imam Ahmed.', mediaId: '' },
    { id: 'sermon2', title: 'Understanding Surah Al-Fatiha', description: 'A deep dive into the opening chapter of the Quran.', mediaId: '' },
];

export async function getSermons(): Promise<Sermon[]> {
  try {
    const adminDb = getAdminDb();
    const docRef = adminDb.collection('siteData').doc('sermons');
    const docSnap = await docRef.get();
    if (docSnap.exists && Array.isArray(docSnap.data()?.sermons)) {
      return docSnap.data()?.sermons as Sermon[];
    }
    await docRef.set({ sermons: defaultSermons });
    return defaultSermons;
  } catch (error) {
    console.error('Error fetching sermons:', error);
    return defaultSermons;
  }
}

export async function updateSermons(sermons: Sermon[]) {
  try {
    const adminDb = getAdminDb();
    const validatedData = z.array(sermonSchema).safeParse(sermons);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join(', ');
      return { success: false, message: `Invalid data: ${errorMessages}` };
    }
    
    const sermonsRef = adminDb.collection('siteData').doc('sermons');
    await sermonsRef.set({ sermons: validatedData.data });
    
    revalidatePath('/');
    revalidatePath('/admin/sermons');

    return { success: true, message: 'Sermons updated successfully!' };
  } catch (error) {
    console.error('Error updating sermons:', error);
    return { success: false, message: 'Failed to update sermons.' };
  }
}

export async function checkDbConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const adminDb = getAdminDb();
    // listCollections() is a lightweight operation to check connectivity.
    await adminDb.listCollections();
    return { connected: true };
  } catch (error: any) {
    console.error("Database connection check failed:", error.message);
    return { connected: false, error: error.message };
  }
}

export async function checkCloudinaryConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
        return { connected: false, error: 'Cloudinary cloud name or upload preset is not set in .env file.' };
    }
    return { connected: true };
}

type NextPrayer = {
  name: string;
  time: string;
};

const parseTime = (timeString: string): Date | null => {
    if (!timeString || !timeString.includes(':')) return null;
    const now = new Date();
    const parsedDate = parse(timeString, 'h:mm a', now);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};


export async function updateWidgetData() {
    try {
        const adminDb = getAdminDb();
        const [prayerTimesData, islamicDateData] = await Promise.all([
            getPrayerTimes(),
            getIslamicDate()
        ]);

        const now = new Date();
        const allTimes: { name: string; time: string; type: 'Azan' | 'Jamat', date: Date}[] = [];
        const isFriday = now.getDay() === 5;

        prayerTimesData.prayers.forEach(p => {
          if ((p.name === 'Jumma' && !isFriday) || (p.name === 'Zuhar' && isFriday)) return;

          const azanDate = parseTime(p.azan);
          const jamatDate = parseTime(p.jamat);
          
          if (azanDate) allTimes.push({ name: p.name, time: p.azan, type: 'Azan', date: azanDate });
          if (jamatDate) allTimes.push({ name: `${p.name} Jamat`, time: p.jamat, type: 'Jamat', date: jamatDate });
        });

        allTimes.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        let nextPrayer: NextPrayer | null = null;
        const upcomingPrayer = allTimes.find(t => t.date > now);

        if (upcomingPrayer) {
            nextPrayer = { name: upcomingPrayer.name, time: upcomingPrayer.time };
        } else {
            const fajr = prayerTimesData.prayers.find(p => p.name === 'Fajr');
            if (fajr) {
                nextPrayer = { name: fajr.name, time: fajr.azan };
            }
        }
        
        const responseData = {
            currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            nextPrayerName: nextPrayer?.name || '...',
            nextPrayerTime: nextPrayer?.time || '...',
            hijriDate: islamicDateData.hijriDate || '...',
            lastUpdated: new Date().toISOString(),
        };

        const widgetRef = adminDb.collection('siteData').doc('widgetData');
        await widgetRef.set(responseData);
        
        // Also upload to Cloudinary
        const jsonString = JSON.stringify(responseData, null, 2);
        const buffer = Buffer.from(jsonString, 'utf-8');
        const stream = Readable.from(buffer);
        
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                public_id: 'clock', 
                resource_type: 'raw',
                overwrite: true,
                invalidate: true,
            },
            (error, result) => {
                if (error) {
                    console.error('Failed to upload widget data to Cloudinary:', error);
                }
            }
        );
        stream.pipe(uploadStream);

        return { success: true, message: "Widget data updated successfully." };

    } catch (error: any) {
        console.error("Failed to update widget data", error);
        return { success: false, message: `Failed to update widget data: ${error.message}` };
    }
}


import React, { Suspense } from 'react';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, PlayCircle, Phone, BookOpen } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import DailyHadithCard from '@/components/daily-hadith-card';
import PrayerTimesCard from '@/components/prayer-times-card';
import ContactForm from '@/components/contact-form';
import type { PrayerTimes } from '@/lib/prayer-times';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { placeholderImages as defaultPlaceholders } from '@/lib/placeholder-images';
import type { CommunityMember, Event, Sermon } from '@/app/admin/actions';
import { getCommunityMembers, getImages, getEvents, getSermons, getPrayerTimes } from '@/app/admin/actions';
import { getIslamicDate } from '@/ai/flows/islamic-date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import IslamicQna from '@/components/islamic-qna';
import HadithCardContent from '@/components/hadith-card-content';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

type MemberWithImage = CommunityMember & { imageUrl: string; imageHint: string };
type EventWithImage = Event & { imageUrl: string; imageHint: string };
type SermonWithMedia = Sermon & { mediaUrl: string; mediaType: 'image' | 'video' };

type HomePageData = {
  heroImage: ImagePlaceholder;
  events: EventWithImage[];
  sermons: SermonWithMedia[];
  galleryImages: ImagePlaceholder[];
  imams: MemberWithImage[];
  muazzins: MemberWithImage[];
  trustees: MemberWithImage[];
  islamicDate: string;
};

async function getHomePageData(): Promise<HomePageData> {
  let islamicDateResult = { hijriDate: 'Not available' };
  try {
    islamicDateResult = await getIslamicDate();
  } catch (e) {
    console.error("Could not fetch Islamic date", e);
  }

  const [communityMembers, allImages, events, sermons] = await Promise.all([
    getCommunityMembers(),
    getImages(),
    getEvents(),
    getSermons(),
  ]);

  const getImage = (
    imageId: string | undefined,
    category: string,
    defaultId: string
  ): { url: string; hint: string; mediaType?: 'image' | 'video' } => {
    const categoryImages =
      (allImages[category] || []) as { id: string; url: string; mediaType?: 'image' | 'video' }[];

    let foundImg = categoryImages.find(img => img.id === imageId);
    if (foundImg) {
      return { url: foundImg.url, hint: 'person', mediaType: foundImg.mediaType };
    }

    const placeholder = defaultPlaceholders.find(p => p.id === defaultId);
    return {
      url: placeholder?.imageUrl || `https://picsum.photos/seed/${defaultId}/200/200`,
      hint: placeholder?.imageHint || 'person',
      mediaType: placeholder?.mediaType || 'image',
    };
  };

  const addImageToMember = (
    member: CommunityMember,
    category: 'imams' | 'muazzins' | 'trustees'
  ): MemberWithImage => {
    const { url, hint } = getImage(member.imageId, category, member.id);
    return { ...member, imageUrl: url, imageHint: hint };
  };

  const imams = communityMembers.imams.map(m => addImageToMember(m, 'imams'));
  const muazzins = communityMembers.muazzins.map(m => addImageToMember(m, 'muazzins'));
  const trustees = communityMembers.trustees.map(m => addImageToMember(m, 'trustees'));

  const eventsWithImages: EventWithImage[] = events.map(event => {
    const { url, hint } = getImage(event.imageId, 'events', event.id);
    return { ...event, imageUrl: url, imageHint: hint };
  });

  const sermonsWithMedia: SermonWithMedia[] = sermons.map(sermon => {
    const { url, mediaType } = getImage(sermon.mediaId, 'sermons', sermon.id);
    return {
      ...sermon,
      mediaUrl: url,
      mediaType: mediaType || 'video',
    };
  });

  const heroImage = defaultPlaceholders.find(p => p.id === 'hero')!;
  if (allImages.hero && allImages.hero[0]) {
    heroImage.imageUrl = allImages.hero[0].url;
  }

  const galleryImages = (allImages.gallery && allImages.gallery.length
    ? allImages.gallery.map(img => ({
        id: img.id,
        imageUrl: img.url,
        description: img.description || 'Gallery image',
        imageHint: img.imageHint || 'gallery',
      }))
    : defaultPlaceholders.filter(p => p.id.startsWith('gallery'))
  );

  return {
    heroImage,
    events: eventsWithImages,
    sermons: sermonsWithMedia,
    galleryImages,
    imams,
    muazzins,
    trustees,
    islamicDate: islamicDateResult.hijriDate,
  };
}

export default async function HomePage() {
  const prayerTimesData: PrayerTimes = await getPrayerTimes();
  const {
    heroImage,
    events,
    sermons,
    galleryImages,
    imams,
    muazzins,
    trustees,
    islamicDate,
  } = await getHomePageData();

  return (
    <div className="flex flex-col">
      <section id="home" className="relative h-[70vh] md:h-[80vh] w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center">
            <h1 className="font-headline text-4xl md:text-6xl font-bold text-primary-foreground drop-shadow-lg">
              Welcome to Masjid e Aaisha Qadeem
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl text-primary-foreground/90 drop-shadow">
              A spiritual sanctuary for worship, education, and community unity.
            </p>
        </div>
        <div className="relative z-20 w-full px-4 pb-8 -mt-24">
            <Suspense fallback={<HadithSkeleton />}>
                <HadithCardContent />
            </Suspense>
        </div>
      </section>

      <section id="prayer-timings" className="py-12 md:py-20 bg-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
            Today's Prayer Timings
          </h2>
          <p className="mt-2 text-md md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Current daily prayer timings for the mosque.
          </p>
          <div className="mt-8 max-w-4xl mx-auto">
            <PrayerTimesCard prayerTimes={prayerTimesData} islamicDate={islamicDate} />
          </div>
        </div>
      </section>

      <Separator />

      <section id="sermons" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary text-center">
            Sermons &amp; Lectures
          </h2>
          <p className="mt-2 text-md md:text-lg text-foreground/80 text-center max-w-2xl mx-auto">
            Listen to our latest sermons and lectures.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sermons.map(sermon => (
              <Card key={sermon.id} className="overflow-hidden group">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer">
                      <Image
                        src={sermon.mediaUrl.replace(/\.(mp4|webm|ogg)$/, '.jpg')}
                        alt={sermon.title}
                        width={400}
                        height={250}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <PlayCircle className="h-16 w-16 text-white/80 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0">
                    <DialogHeader className="p-4">
                      <DialogTitle>{sermon.title}</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video">
                      {sermon.mediaType === 'video' ? (
                        <video controls src={sermon.mediaUrl} className="w-full h-full" />
                      ) : (
                        <Image
                          src={sermon.mediaUrl}
                          alt={sermon.title}
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <CardHeader>
                  <CardTitle className="text-lg">{sermon.title}</CardTitle>
                  <CardDescription>{sermon.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      <section id="community" className="py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
            Our Community Leaders
          </h2>
          <p className="mt-2 text-md md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Meet the Imam, Muazzin, and dedicated members of our trust.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[...imams, ...muazzins].map(member => (
              <Card key={member.id} className="flex flex-col items-center text-center p-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="w-24 h-24 mb-4 cursor-pointer">
                      <AvatarImage
                        src={member.imageUrl}
                        alt={member.name}
                        data-ai-hint={member.imageHint}
                      />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="max-w-md p-0">
                    <Image
                      src={member.imageUrl}
                      alt={member.name}
                      width={600}
                      height={600}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
                <h3 className="font-headline text-xl font-semibold text-primary">
                  {member.name}
                </h3>
                <p className="text-muted-foreground">{member.role}</p>
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-2 hover:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </a>
                )}
              </Card>
            ))}
          </div>
          <div className="mt-12 md:mt-16">
            <h3 className="font-headline text-2xl md:text-3xl font-bold text-primary">
              Trusty Members
            </h3>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
              {trustees.map(member => (
                <div key={member.id} className="flex flex-col items-center text-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Avatar className="w-20 h-20 mb-2 cursor-pointer">
                        <AvatarImage
                          src={member.imageUrl}
                          alt={member.name}
                          data-ai-hint={member.imageHint}
                        />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </DialogTrigger>
                    <DialogContent className="max-w-md p-0">
                       <Image
                          src={member.imageUrl}
                          alt={member.name}
                          width={600}
                          height={600}
                          className="w-full h-full object-contain rounded-lg"
                        />
                    </DialogContent>
                  </Dialog>
                  <h4 className="font-semibold text-sm sm:text-base">{member.name}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="mt-1 text-xs text-muted-foreground flex items-center justify-center gap-1.5 hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{member.phone}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section id="events" className="py-12 md:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary text-center">
            Events &amp; Announcements
          </h2>
          <p className="mt-2 text-md md:text-lg text-foreground/80 text-center max-w-2xl mx-auto">
            Stay informed about our upcoming events and special announcements.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {events.map(event => (
              <Card key={event.id} className="overflow-hidden group">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="overflow-hidden cursor-pointer">
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={400}
                        height={250}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                        data-ai-hint={event.imageHint}
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl p-0">
                    <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={800}
                        height={500}
                        className="w-full h-full object-contain rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
                <CardHeader>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription>{event.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      <section id="gallery" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary text-center">
            Gallery
          </h2>
          <p className="mt-2 text-md md:text-lg text-foreground/80 text-center max-w-2xl mx-auto">
            Moments from our community.
          </p>
          <div className="mt-10 max-w-5xl mx-auto">
            <Carousel opts={{ align: 'start', loop: true }} className="w-full">
              <CarouselContent>
                {galleryImages.map(image => (
                  <CarouselItem key={image.id} className="sm:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                      <Card className="overflow-hidden">
                        <Dialog>
                          <DialogTrigger asChild>
                            <CardContent className="flex aspect-square items-center justify-center p-0 cursor-pointer">
                              <Image
                                src={image.imageUrl}
                                alt={image.description}
                                width={400}
                                height={400}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 ease-in-out"
                                data-ai-hint={image.imageHint}
                              />
                            </CardContent>
                          </DialogTrigger>
                           <DialogContent className="max-w-3xl p-0">
                            <Image
                                src={image.imageUrl}
                                alt={image.description}
                                width={800}
                                height={800}
                                className="w-full h-full object-contain rounded-lg"
                            />
                           </DialogContent>
                        </Dialog>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>
        </div>
      </section>

      <Separator />

      <section id="contact" className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
                Get In Touch
              </h2>
              <p className="mt-4 text-md md:text-lg text-foreground/80">
                We are located in the heart of the city...
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <span>Masjid e Aaisha Qadeem, Hifazat Nagar, Ankleshwar, Gujarat 393002</span>
                </div>
                <div className="aspect-w-16 aspect-h-9 mt-4 rounded-lg overflow-hidden border">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3687.0570932499877!2d73.02529517571707!3d21.634436280182964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be03d1a8d1ed4a5%3A0xe5a8b2e7e9b7e3c!2sMasjid%20e%20Aaisha%20Qadeem!5e0!3m2!1sen!2sin!4v...)"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Masjid e Aaisha Qadeem Location"
                  ></iframe>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function HadithSkeleton() {
  return (
    <div className="max-w-md mx-auto bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-card-foreground">
            Hadith of the Day
          </h3>
        </div>
        <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}

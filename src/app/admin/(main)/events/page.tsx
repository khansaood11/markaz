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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Event } from '@/app/admin/actions';
import { getEvents, updateEvents, getImages } from '@/app/admin/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

type Images = Record<string, { id: string; url: string }[]>;

export default function EventsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [images, setImages] = useState<Images>({});

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [fetchedEvents, fetchedImages] = await Promise.all([
         getEvents(),
         getImages()
      ]);
      setEvents(fetchedEvents);
      setImages(fetchedImages as Images);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const handleEventChange = (
    index: number,
    field: keyof Event,
    value: string
  ) => {
    if (!events) return;
    const updatedEvents = [...events];
    updatedEvents[index] = {
      ...updatedEvents[index],
      [field]: value,
    };
    setEvents(updatedEvents);
  };

  const addEvent = () => {
    if (!events) return;
    const newId = `event${events.length + 1}_${Date.now()}`;
    const newEvent: Event = { id: newId, title: '', description: '' };
    setEvents([...events, newEvent]);
  };

  const removeEvent = (index: number) => {
    if (!events) return;
    const updatedEvents = [...events];
    updatedEvents.splice(index, 1);
    setEvents(updatedEvents);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!events) return;
    
    setIsSubmitting(true);
    const result = await updateEvents(events);
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
  
  const getImageForEvent = (event: Event) => {
    if (!event.imageId) return null;
    const img = (images['events'] || []).find(i => i.id === event.imageId);
    return img;
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Events & Announcements</h1>
        <p className="text-muted-foreground mt-1">
          Manage the events and announcements that appear on your homepage.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          {(events || []).map((event, index) => {
            const eventImage = getImageForEvent(event);
            return (
            <Card key={event.id}>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start relative">
                <div className='flex items-center gap-4 col-span-1 md:col-span-3'>
                    {eventImage ? 
                        <Image src={eventImage.url} alt={event.title} width={100} height={60} className='rounded-md object-cover w-24 h-16'/>
                        : <div className='w-24 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center'>No Image</div>
                    }
                    <div className='space-y-2 flex-1'>
                       <Label htmlFor={`event-title-${index}`}>Title</Label>
                       <Input
                         id={`event-title-${index}`}
                         value={event.title}
                         onChange={e => handleEventChange(index, 'title', e.target.value)}
                       />
                    </div>
                 </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`event-description-${index}`}>Description</Label>
                  <Textarea
                    id={`event-description-${index}`}
                    value={event.description}
                    onChange={e => handleEventChange(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                 <div className="space-y-2 self-end">
                  <Label htmlFor={`event-image-${index}`}>Picture</Label>
                   <Select
                      value={event.imageId || ''}
                      onValueChange={value => handleEventChange(index, 'imageId', value === 'no-image' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-image">No Image</SelectItem>
                        {(images['events'] || []).map(img => (
                          <SelectItem key={img.id} value={img.id}>
                            {img.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEvent(index)}
                    >
                    <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )})}
          <Button type="button" variant="outline" onClick={addEvent}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Events
        </Button>
      </form>
    </div>
  );
}

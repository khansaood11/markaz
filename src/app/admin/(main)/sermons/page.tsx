
'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Sermon } from '@/app/admin/actions';
import { getSermons, updateSermons, getImages } from '@/app/admin/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

type Images = Record<string, { id: string; url: string }[]>;

export default function SermonsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sermons, setSermons] = useState<Sermon[] | null>(null);
  const [images, setImages] = useState<Images>({});

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [fetchedSermons, fetchedImages] = await Promise.all([
         getSermons(),
         getImages()
      ]);
      setSermons(fetchedSermons);
      setImages(fetchedImages as Images);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const handleSermonChange = (
    index: number,
    field: keyof Sermon,
    value: string
  ) => {
    if (!sermons) return;
    const updatedSermons = [...sermons];
    updatedSermons[index] = {
      ...updatedSermons[index],
      [field]: value,
    };
    setSermons(updatedSermons);
  };

  const addSermon = () => {
    if (!sermons) return;
    const newId = `sermon${sermons.length + 1}_${Date.now()}`;
    const newSermon: Sermon = { id: newId, title: '', description: '' };
    setSermons([...sermons, newSermon]);
  };

  const removeSermon = (index: number) => {
    if (!sermons) return;
    const updatedSermons = [...sermons];
    updatedSermons.splice(index, 1);
    setSermons(updatedSermons);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sermons) return;
    
    setIsSubmitting(true);
    const result = await updateSermons(sermons);
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
  
  const getImageForSermon = (sermon: Sermon) => {
    if (!sermon.mediaId) return null;
    const img = (images['sermons'] || []).find(i => i.id === sermon.mediaId);
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
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Sermons & Lectures</h1>
        <p className="text-muted-foreground mt-1">
          Manage the audio and video sermons that appear on your homepage.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          {(sermons || []).map((sermon, index) => {
            const sermonImage = getImageForSermon(sermon);
            const thumbnailUrl = sermonImage
              ? sermonImage.url.endsWith('.mp4') || sermonImage.url.endsWith('.webm') || sermonImage.url.endsWith('.ogg')
                ? sermonImage.url.replace(/\.(mp4|webm|ogg)$/, '.jpg')
                : sermonImage.url
              : '';

            return (
            <Card key={sermon.id}>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start relative">
                <div className='flex items-center gap-4 col-span-1 md:col-span-3'>
                    {thumbnailUrl ? 
                        <Image src={thumbnailUrl} alt={sermon.title} width={100} height={60} className='rounded-md object-cover w-24 h-16'/>
                        : <div className='w-24 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs text-center'>No Media</div>
                    }
                    <div className='space-y-2 flex-1'>
                       <Label htmlFor={`sermon-title-${index}`}>Title</Label>
                       <Input
                         id={`sermon-title-${index}`}
                         value={sermon.title}
                         onChange={e => handleSermonChange(index, 'title', e.target.value)}
                       />
                    </div>
                 </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`sermon-description-${index}`}>Description</Label>
                  <Textarea
                    id={`sermon-description-${index}`}
                    value={sermon.description}
                    onChange={e => handleSermonChange(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                 <div className="space-y-2 self-end">
                  <Label htmlFor={`sermon-image-${index}`}>Audio/Video File</Label>
                   <Select
                      value={sermon.mediaId || ''}
                      onValueChange={value => handleSermonChange(index, 'mediaId', value === 'no-media' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a media file" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-media">No Media</SelectItem>
                        {(images['sermons'] || []).map(img => (
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
                    onClick={() => removeSermon(index)}
                    >
                    <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )})}
          <Button type="button" variant="outline" onClick={addSermon}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sermon
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Sermons
        </Button>
      </form>
    </div>
  );
}

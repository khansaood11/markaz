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
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CommunityMembers, CommunityMember } from '@/app/admin/actions';
import { getCommunityMembers, updateCommunityMembers, getImages } from '@/app/admin/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

type Images = Record<string, { id: string; url: string }[]>;

export default function CommunityPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<CommunityMembers | null>(null);
  const [images, setImages] = useState<Images>({});

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [fetchedMembers, fetchedImages] = await Promise.all([
         getCommunityMembers(),
         getImages()
      ]);
      setMembers(fetchedMembers);
      setImages(fetchedImages as Images);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const handleMemberChange = (
    category: keyof CommunityMembers,
    index: number,
    field: keyof CommunityMember,
    value: string
  ) => {
    if (!members) return;
    const updatedMembers = { ...members };
    (updatedMembers[category] as CommunityMember[])[index] = {
      ...(updatedMembers[category] as CommunityMember[])[index],
      [field]: value,
    };
    setMembers(updatedMembers);
  };

  const addMember = (category: keyof CommunityMembers) => {
    if (!members) return;
    const newId = `${category.slice(0, -1)}${members[category].length + 1}_${Date.now()}`;
    const newMember: CommunityMember = { id: newId, name: '', role: '', phone: '' };
    const updatedMembers = {
      ...members,
      [category]: [...members[category], newMember],
    };
    setMembers(updatedMembers);
  };

  const removeMember = (category: keyof CommunityMembers, index: number) => {
    if (!members) return;
    const updatedMembers = { ...members };
    (updatedMembers[category] as CommunityMember[]).splice(index, 1);
    setMembers(updatedMembers);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!members) return;
    
    setIsSubmitting(true);
    const result = await updateCommunityMembers(members);
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
  
  const getImageForMember = (member: CommunityMember) => {
    if (!member.imageId) return null;
    const categoryKey = Object.keys(images).find(key => 
        images[key].some(img => img.id === member.imageId)
    );
    if (!categoryKey) return null;

    const img = (images[categoryKey] || []).find(i => i.id === member.imageId);
    return img;
  }

  const renderMemberList = (category: keyof CommunityMembers, title: string) => {
    if (!members) return null;

    const imageOptions = images[category as keyof Images] || [];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(members[category] as CommunityMember[]).map((member, index) => {
            const memberImage = getImageForMember(member);
            return (
            <div key={member.id} className="p-4 border rounded-md space-y-4 relative">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                 <div className='flex items-center gap-4 col-span-1 md:col-span-2 xl:col-span-1'>
                    {memberImage ? 
                        <Image src={memberImage.url} alt={member.name} width={60} height={60} className='rounded-full object-cover w-16 h-16'/>
                        : <div className='w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs text-center'>No Image</div>
                    }
                    <div className='space-y-2 flex-1'>
                       <Label htmlFor={`${category}-name-${index}`}>Name</Label>
                       <Input
                         id={`${category}-name-${index}`}
                         value={member.name}
                         onChange={e => handleMemberChange(category, index, 'name', e.target.value)}
                       />
                    </div>
                 </div>
                <div className="space-y-2">
                  <Label htmlFor={`${category}-role-${index}`}>Role</Label>
                  <Input
                    id={`${category}-role-${index}`}
                    value={member.role}
                    onChange={e => handleMemberChange(category, index, 'role', e.target.value)}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor={`${category}-phone-${index}`}>Phone</Label>
                  <Input
                    id={`${category}-phone-${index}`}
                    value={member.phone || ''}
                    onChange={e => handleMemberChange(category, index, 'phone', e.target.value)}
                    placeholder="e.g. +1 123 456 7890"
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor={`${category}-image-${index}`}>Picture</Label>
                   <Select
                      value={member.imageId || ''}
                      onValueChange={value => handleMemberChange(category, index, 'imageId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-image">No Image</SelectItem>
                        {imageOptions.map(img => (
                          <SelectItem key={img.id} value={img.id}>
                            {img.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>
               <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMember(category, index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
            </div>
          )})}
          <Button type="button" variant="outline" onClick={() => addMember(category)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add {title.slice(0, -1)}
          </Button>
        </CardContent>
      </Card>
    );
  };


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
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Community Members</h1>
        <p className="text-muted-foreground mt-1">
          Update the names, roles, and pictures of community leaders and trust members.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {renderMemberList('imams', 'Imams')}
        {renderMemberList('muazzins', 'Muazzins')}
        {renderMemberList('trustees', 'Trustees')}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Community Members
        </Button>
      </form>
    </div>
  );
}

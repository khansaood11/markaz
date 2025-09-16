
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { updateImages, deleteImage } from '@/app/admin/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';


type Images = Record<string, { id: string; url: string, linkedMemberId?: string, mediaType?: 'image' | 'video' }[]>;

export function MediaUploadForm() {
    const [uploading, setUploading] = React.useState(false);
    const [newMediaCategory, setNewMediaCategory] = React.useState('gallery');
    const { toast } = useToast();
    const router = useRouter();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            toast({ title: "Error", description: "Cloudinary configuration is missing. Please check your environment variables.", variant: "destructive" });
            return;
        }

        setUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            
            const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Upload to Cloudinary failed.');
            }
            
            const uploadResult = await response.json();
            
            const dbResult = await updateImages({
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
                resource_type: uploadResult.resource_type,
                category: newMediaCategory,
            });
            
            if (dbResult.success) {
                toast({ title: "Success", description: "Media uploaded and saved." });
                router.refresh();
            } else {
                throw new Error(dbResult.message || 'Failed to save media metadata.');
            }

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({ title: "Error", description: error.message || "Failed to upload file.", variant: "destructive" });
        } finally {
            setUploading(false);
            event.target.value = ''; // Reset file input
        }
    };
    const mediaCategories = [
        { value: 'hero', label: 'Hero' },
        { value: 'gallery', label: 'Gallery' },
        { value: 'events', label: 'Events' },
        { value: 'sermons', label: 'Sermons' },
        { value: 'imams', label: 'Imams' },
        { value: 'muazzins', label: 'Muazzins' },
        { value: 'trustees', label: 'Trustees' },
    ];
    
    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Upload New Media</CardTitle>
                <CardDescription>Select a category then upload your image or video file. It will be added to the gallery and available for use in other sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="category-select">Assign to Category</Label>
                        <Select value={newMediaCategory} onValueChange={setNewMediaCategory}>
                            <SelectTrigger id="category-select">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {mediaCategories.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Label htmlFor="media-upload" className={`flex items-center justify-center w-full h-20 px-4 transition bg-background border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}>
                        <span className="flex items-center space-x-2">
                            {uploading ? <Loader2 className="h-6 w-6 text-gray-600 animate-spin" /> : <Upload className="h-6 w-6 text-gray-600" />}
                            <span className="font-medium text-gray-600 text-center text-sm sm:text-base">
                                {uploading ? 'Uploading...' : 'Click to browse or drop file'}
                            </span>
                        </span>
                        <Input
                            id="media-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,video/*"
                            disabled={uploading}
                        />
                    </Label>
                </div>
            </CardContent>
        </Card>
    );
}

export function MediaList({ images }: { images: Images }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();

    const handleDeleteMedia = async (id: string) => {
        startTransition(async () => {
            try {
                const result = await deleteImage(id);
                if (result.success) {
                    toast({ title: "Success", description: "Media removed from gallery." });
                    router.refresh();
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                toast({ title: "Error", description: error.message || "Could not remove media.", variant: "destructive" });
            }
        });
    }

    const mediaCategories = [
        { value: 'hero', label: 'Hero' },
        { value: 'gallery', label: 'Gallery' },
        { value: 'events', label: 'Events' },
        { value: 'sermons', label: 'Sermons' },
        { value: 'imams', label: 'Imams' },
        { value: 'muazzins', label: 'Muazzins' },
        { value: 'trustees', label: 'Trustees' },
    ];

    const getVideoThumbnail = (url: string) => {
        return url.replace(/\.(mp4|webm|ogg)$/, '.jpg');
    }

    return (
        <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto">
                {mediaCategories.map(cat => (
                    <TabsTrigger key={cat.value} value={cat.value} className="capitalize">{cat.label}</TabsTrigger>
                ))}
            </TabsList>
            {mediaCategories.map(cat => (
                <TabsContent key={cat.value} value={cat.value}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
                        {(images[cat.value] || []).map((item) => (
                            <Card key={item.id} className="relative group overflow-hidden">
                                <div className="absolute top-2 right-2 z-10 p-1 bg-black/50 rounded-full">
                                    {item.mediaType === 'video' ? <Video className="h-4 w-4 text-white" /> : <ImageIcon className="h-4 w-4 text-white" />}
                                </div>
                                <Image
                                    src={item.mediaType === 'video' ? getVideoThumbnail(item.url) : item.url}
                                    alt={`Media file ${item.id}`}
                                    width={300}
                                    height={300}
                                    className="object-cover w-full h-full aspect-square"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteMedia(item.id)}
                                        disabled={isPending}
                                    >
                                        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {(images[cat.value] || []).length === 0 && (
                        <p className="text-muted-foreground text-center py-8">No media in the '{cat.label}' category yet.</p>
                    )}
                </TabsContent>
            ))}
        </Tabs>
    )
}

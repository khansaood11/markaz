
import React from 'react';
import { getImages } from '@/app/admin/actions';
import { MediaUploadForm, MediaList } from './media-client-components';


export default async function MediaManagerPage() {
    const images = await getImages();

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <div className='flex items-center justify-between'>
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Media Manager</h1>
            </div>
            <MediaUploadForm />
            <MediaList images={images} />
        </div>
    );
}

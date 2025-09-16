
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        return new NextResponse(JSON.stringify({ error: 'Cloudinary configuration is missing.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Construct the permanent URL to the raw file on Cloudinary
    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/v${Date.now()}/clock.json`;

    // Redirect to the Cloudinary URL
    return NextResponse.redirect(cloudinaryUrl, 302);
}

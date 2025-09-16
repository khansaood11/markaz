
'use server';

import { getAdminDb } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const widgetDataRef = adminDb.collection('siteData').doc('widgetData');
    const docSnap = await widgetDataRef.get();

    if (!docSnap.exists) {
      const errorResponse = { error: 'Widget data not found. Please run the cron job first.' };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const data = docSnap.data();

    // Manually create a JSON response to ensure correct headers and format
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
    });
    
  } catch (error: any) {
    console.error("Failed to fetch widget data from Firestore:", error);
    const errorResponse = {
      currentTime: 'Error',
      nextPrayerName: 'Error',
      nextPrayerTime: 'Error',
      hijriDate: 'Error',
      error: error.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

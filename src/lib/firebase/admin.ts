import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let adminDb: Firestore | undefined;

function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK will not be initialized.'
    );
    throw new Error('Firebase Admin SDK not initialized.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    let adminApp: App;

    if (!getApps().some(app => app.name === 'admin-app')) {
      adminApp = initializeApp(
        {
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        },
        'admin-app'
      );
    } else {
      adminApp = getApps().find(app => app.name === 'admin-app')!;
    }

    adminDb = getFirestore(adminApp);
    return adminDb;
  } catch (e: any) {
    console.error('Firebase Admin SDK initialization failed:', e.message);
    if (e.code === 'invalid-credential') {
      console.error(
        'The service account key is invalid. Please check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.'
      );
    } else if (e instanceof SyntaxError) {
      console.error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid, unescaped JSON string.'
      );
    }
    throw new Error('Firebase Admin SDK initialization failed.');
  }
}

export { getAdminDb };

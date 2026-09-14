import { App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

let database: Firestore | null = null;

export function firebaseAdminConfigured(): boolean {
  return !process.env.VERCEL || Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function adminApp(): App {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return initializeApp({ credential: applicationDefault() });
  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  return initializeApp({ credential: cert(serviceAccount) });
}

export function adminDb(): Firestore {
  if (!database) database = getFirestore(adminApp(), process.env.FIRESTORE_DATABASE_ID || '(default)');
  return database;
}

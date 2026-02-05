import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBGs5lTjZSy67yI0dhPnwp-l2R3XVwo8fg',
  authDomain: 'shaira-journal.firebaseapp.com',
  projectId: 'shaira-journal',
  storageBucket: 'shaira-journal.firebasestorage.app',
  messagingSenderId: '580162952004',
  appId: '1:580162952004:web:ad4b8b0b213d8f58d79511',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
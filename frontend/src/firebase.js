//initializing firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app);

console.log("ENV CHECK:");
console.log("API KEY:", process.env.REACT_APP_FIREBASE_API_KEY);
console.log("AUTH DOMAIN:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log("PROJECT ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log("STORAGE BUCKET:", process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log("SENDER ID:", process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log("APP ID:", process.env.REACT_APP_FIREBASE_APP_ID);
console.log("MEASUREMENT ID:", process.env.REACT_APP_FIREBASE_MEASUREMENT_ID);
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Comfort Fuel Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDaarAPpoT6BJ9iXhKit0rACptafjJxazM",
  authDomain: "comfort-fuel.firebaseapp.com",
  projectId: "comfort-fuel",
  storageBucket: "comfort-fuel.firebasestorage.app",
  messagingSenderId: "520695903244",
  appId: "1:520695903244:web:8656a14cbc7520a9ccea29",
  measurementId: "G-XVS004DJWP",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

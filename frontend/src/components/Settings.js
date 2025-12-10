import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

function Settings() {
  const user = auth.currentUser; 
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const settingsRef = doc(db, "userSettings", user.uid);

  // Fetch user name and settings on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      // Name from Firestore if email login, else from Google profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setFirstName(userDoc.data().first_name || "");
        setLastName(userDoc.data().last_name || "");
      }

      // Load Mode and notifications from Firestore
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDarkMode(data.darkMode || false);
        setNotifications(data.notifications !== undefined ? data.notifications : true);
        applyDarkMode(data.darkMode || false); // apply immediately
      }
    };

    fetchSettings();
  }, [user]);

  const applyDarkMode = (enabled) => {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  // Toggle handlers
  const handleDarkModeToggle = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    applyDarkMode(newMode);

    await setDoc(
      settingsRef,
      { darkMode: newMode, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  const handleNotificationsToggle = async () => {
    const newValue = !notifications;
    setNotifications(newValue);

    await setDoc(
      settingsRef,
      { notifications: newValue, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Welcome, {firstName} {lastName}</h2>

      <div className="settings-item">
        <label>Dark Mode</label>
        <input type="checkbox" checked={darkMode} onChange={handleDarkModeToggle} />
      </div>

      <div className="settings-item">
        <label>Notifications</label>
        <input type="checkbox" checked={notifications} onChange={handleNotificationsToggle} />
      </div>
    </div>
  );
}

export default Settings;

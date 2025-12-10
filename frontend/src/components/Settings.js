import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

function Settings() {
  const user = auth.currentUser; 
  const [darkMode, setDarkMode] = useState(false);
  const [firstName, setFirstName] = useState(user?.displayName || "");
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
      } else if (user.displayName) {
        setFirstName(user.displayName);
        setLastName("");
      }

      // Load Mode and notifications from Firestore
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDarkMode(data.darkMode || false);
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

  return (
    <div className="settings-container">
      <h2 className="settings-title">Profile & Settings</h2>
      <p className="subtitle">Manage your account preferences.</p>

      <div className="profile-card">
        <div className="field-label">Name</div>
        <div className="field-value">
          {`${firstName} ${lastName}`.trim() || "Unknown"}
        </div>

        <div className="field-label">Email</div>
        <div className="field-value">{user?.email || "Not provided"}</div>

        <div className="toggle-row">
          <span>Dark Mode</span>
          <div
            className={`fake-toggle ${darkMode ? "on" : ""}`}
            onClick={handleDarkModeToggle}
            role="button"
          ></div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

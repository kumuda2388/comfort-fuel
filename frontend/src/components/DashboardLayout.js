import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function DashboardLayout() {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoadingUser(false);

      if (u) {
        // Get mode from settings
        const settingsRef = doc(db, "settings", u.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setDarkMode(settingsSnap.data().darkMode || false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="dashboard-wrapper flex" style={{ height: "100vh" }}>
      <Navbar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;

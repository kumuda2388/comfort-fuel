import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { FaBell } from "react-icons/fa";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function DashboardLayout() {
  const [isOpen, setIsOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

  useEffect(() => {
    if (loadingUser || !user) return;

    const notifRef = collection(db, "notifications");

    // Query for this user, descending by createdAt
    const q = query(
      notifRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        });
        setNotifications(list);
      },
      (error) => {
        console.error("Firestore error:", error);
      }
    );

    return unsubscribe;
  }, [user, loadingUser]);

  // mark notifications as read
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  return (
    <div className="dashboard-wrapper flex" style={{ height: "100vh" }}>
      <Navbar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

      <div className="main-content">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
            position: "relative",
          }}
        >
          <FaBell
            size={24}
            style={{ cursor: "pointer" }}
            onClick={() => setShowNotifications(!showNotifications)}
          />

          {showNotifications && (
            <div
              className="notif-dropdown"
              style={{
                position: "absolute",
                right: 0,
                top: "30px",
                width: "300px",
                maxHeight: "400px",
                overflowY: "auto",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                background: darkMode ? "#1e1e1e" : "#fff",
                color: darkMode ? "#f5f5f5" : "#000",
                zIndex: 1000,
              }}
            >
              {notifications.length === 0 ? (
                <p style={{ padding: "1rem" }}>No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    style={{
                      padding: "0.8rem 1rem",
                      borderBottom: "1px solid #ddd",
                      background: n.read
                        ? darkMode
                          ? "#2a2a2a"
                          : "#f0f0f0"
                        : darkMode
                        ? "#3a3a3a"
                        : "#eaf2ff",
                      cursor: "pointer",
                      color: darkMode ? "#f5f5f5" : "#000",
                    }}
                  >
                    <p style={{ margin: 0 }}>{n.message}</p>
                    <small style={{ color: darkMode ? "#aaa" : "#666" }}>
                      {n.createdAt.toLocaleString()}
                    </small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;

import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  addDoc,
  setDoc,
} from "firebase/firestore";

function Chats() {
  const user = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [userName, setUserName] = useState("");
  const messagesEndRef = useRef();

  const ensureUserProfile = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const display = user.displayName || (user.email ? user.email.split("@")[0] : "User");
      await setDoc(userRef, {
        first_name: display,
        displayName: user.displayName || display,
        email: user.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setUserName(display);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get user name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      await ensureUserProfile();
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.first_name || data.displayName || "User");
      } else if (user.displayName) {
        setUserName(user.displayName);
      }
    };
    fetchUserName();
  }, [user]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!user) return;

    const chatRef = doc(db, "chats", user.uid);

    const unsubscribe = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const msgs = (data.messages || []).slice().sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return ta - tb;
        });
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });

    return unsubscribe;
  }, [user]);

  // Send message
  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    if (!user) return;

    const chatRef = doc(db, "chats", user.uid);

    const messageData = {
      sender: "user",
      message: newMsg.trim(),
      createdAt: new Date(),
    };

    // Add message to the chat document (array)
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      await updateDoc(chatRef, {
        messages: arrayUnion(messageData),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(chatRef, {
        messages: [messageData],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Create notification for vendor
    await addDoc(collection(db, "vendor_notifications"), {
      message: `${userName} sent a new message.`,
      userId: user.uid,
      type: "chat",
      read: false,
      createdAt: serverTimestamp(),
    });

    setNewMsg("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return <div style={{ padding: 16 }}>Please log in to chat.</div>;
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Chat with Support</h3>
      </div>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 10, padding: "8px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              textAlign: msg.sender === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: msg.sender === "user" ? "#4a90e2" : "#e5e7eb",
                color: msg.sender === "user" ? "#fff" : "#111827",
                padding: "8px 12px",
                borderRadius: "12px",
                maxWidth: "80%",
              }}
            >
              {msg.message}
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>
              {msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleString()
                : new Date(msg.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="subtitle">No messages yet.</p>}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex" style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        />
        <button
          onClick={sendMessage}
          className="btn-primary"
          type="button"
          disabled={!newMsg.trim()}
          style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chats;

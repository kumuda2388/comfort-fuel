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
  addDoc,setDoc
} from "firebase/firestore";

function Chats() {
  const user = auth.currentUser;
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [userName, setUserName] = useState("");
  const messagesEndRef = useRef();

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get user name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserName(snap.data().first_name || "User");
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
        setMessages(data.messages || []);
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
      message: newMsg,
      createdAt: new Date(),
    };

    // Add message to the chat document (array)
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      await updateDoc(chatRef, {
        messages: arrayUnion(messageData),
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "80vh",
        border: "1px solid #ccc",
        padding: "10px",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px" }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "8px",
              textAlign: msg.sender === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                display: "inline-block",
    background: msg.sender === "user"
      ? "var(--chat-user-bg)"
      : "var(--chat-vendor-bg)",
    color: "var(--chat-text)",
    padding: "6px 12px",
    borderRadius: "12px",
              }}
            >
              {msg.message}
            </div>
            <div style={{ fontSize: "10px", color: "#888" }}>
              {msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleString()
                : new Date(msg.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          style={{ marginLeft: "5px", padding: "8px 12px" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chats;

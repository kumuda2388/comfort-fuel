import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function ChangePassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();

    try {
      // STEP 1: Sign in again using email + *old password*
      const loginUser = await signInWithEmailAndPassword(
        auth,
        email,
        oldPassword
      );

      const user = loginUser.user;

      // STEP 2: Check if this account was created by GOOGLE
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        if (userData.auth_provider === "google") {
          alert("Password cannot be changed. This account was created with Google Sign-In.");
          return;
        }
      }

      // STEP 3: Reauthenticate user
      const credential = EmailAuthProvider.credential(email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // STEP 4: CHECK new password length
      if (newPassword.length < 6) {
        alert("New password must be at least 6 characters.");
        return;
      }

      // STEP 5: Update password
      await updatePassword(user, newPassword);

      alert("Password updated successfully. Please login again.");
      navigate("/login");

    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-container">
      <h1 className="app-title">Comfort Fuel</h1>
      <h2>Change Password</h2>

      <form onSubmit={handleChangePassword} className="login-form">
        <input
          type="email"
          className="input-field"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          required
        />

        <input
          type="password"
          className="input-field"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />

        <input
          type="password"
          className="input-field"
          placeholder="New Password (min 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn-primary">
          Update Password
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;

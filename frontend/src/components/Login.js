import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, googleProvider, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -----------------------------------------
  // EMAIL + PASSWORD LOGIN
  // -----------------------------------------
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    try {
      // First try to login using Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Now check if Firestore user exists
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User not found in database. Please register first.");
        navigate("/register");
        return;
      }

      const userData = userSnap.data();

      // Prevent login if account was created with Google
      if (userData.auth_provider === "google") {
        alert("This account was created with Google. Please login using Google.");
        return;
      }

      navigate("/dashboard");

    } catch (error) {
      alert(error.message);
    }
  };

  // -----------------------------------------
  // GOOGLE LOGIN
  // -----------------------------------------
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
  
      const user = result.user;
      const isNew = result._tokenResponse?.isNewUser;
  
      if (isNew) {
        // DELETE the auto-created Firebase Auth user
        await user.delete();
  
        alert("First-time Google login. Please complete registration.");
        navigate("/register");
        return;
      }
  
      // Existing Google user → login normally
      navigate("/dashboardLayout");
  
    } catch (error) {
      alert(error.message);
    }
  };
  

  return (
    <div className="login-container">
      <h1 className="app-title">Comfort Fuel</h1>
      <h2>Login</h2>

      <form onSubmit={handleEmailLogin} className="login-form">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn-primary">
          Login
        </button>
      </form>

      <p style={{ marginTop: "10px" }}>
        Don't have an account? <Link to="/register">Register</Link>
      </p>

      <hr className="divider" />

      <button onClick={handleGoogleLogin} className="btn-google">
        Continue with Google
      </button>

      <p style={{ marginTop: "15px" }}>
      <Link to="/change-password">Change Password?</Link>
    </p>

    </div>
  );
}

export default Login;

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, googleProvider, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // email password registration
  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      await setDoc(doc(db, "users", user.uid), {
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: "user",
        auth_provider: "email_password",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      alert("Registration successful!");
      navigate("/login"); // redirect to login

    } catch (error) {
      console.error("Registration Error:", error);
      alert(error.message);
    }
  };

  // google sign in
  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          first_name: user.displayName?.split(" ")[0] || "",
          last_name: user.displayName?.split(" ")[1] || "",
          email: user.email,
          role: "user",
          auth_provider: "google",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Google sign-in successful!");
      navigate("/login");

    } catch (error) {
      console.error("Google Auth Error:", error);
      alert(error.message);
    }
  };

  return (
    <div className="register-container">
      <h1 className="app-title">Comfort Fuel</h1>
      <h2>Create Account</h2>

      <form className="register-form" onSubmit={handleRegister}>
        <input
          type="text"
          className="input-field"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <input
          type="text"
          className="input-field"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <input
          type="email"
          className="input-field"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="input-field"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn-primary">
          Register
        </button>
      </form>

      <p style={{ marginTop: "10px" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>

      <hr className="divider" />

      <button onClick={handleGoogleSignup} className="btn-google">
        Continue with Google
      </button>
    </div>
  );
}

export default Register;

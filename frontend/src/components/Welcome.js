import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="register-container">
      <h1 className="app-title">Comfort Fuel</h1>
      <h2>Who are you?</h2>
      <p className="subtitle">Choose how you want to continue.</p>

      <div
        className="card"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "left",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginTop: "20px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/register")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate("/register");
          }
        }}
      >
        <h3>Customer</h3>
        <p>Create an account to browse menus, chat with vendors, and place orders.</p>
      </div>

      <div
        className="card"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "left",
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginTop: "12px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/vendor")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate("/vendor");
          }
        }}
      >
        <h3>Vendor</h3>
        <p>Sign in to manage recipes, accept orders, and chat with your customers.</p>
      </div>
    </div>
  );
}

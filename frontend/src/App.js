import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import DashboardLayout from "./components/DashboardLayout";
import Orders from "./components/Orders";
import Chats from "./components/Chats";
import Cart from "./components/Cart";
import About from "./components/About";
import Recipes from "./components/Recipes";
import Settings from "./components/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import Contact from "./components/Contact";
import { AuthProvider } from "./Context/AuthContext";
import VendorApp from "./vendor/VendorApp";

function App() {
  
  // Apply theme immediately on app start
  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    if (saved) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Navigate to="/register" />} />

          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route path="/change-password" element={<ChangePassword />} />

          <Route
            path="/dashboardLayout"
            element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<Recipes />} />
            <Route path="orders" element={<Orders />} />
            <Route path="cart" element={<Cart />} />
            <Route path="chats" element={<Chats />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="about" element={<About />} />
          <Route path="settings" element={<Settings />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        <Route path="/vendor" element={<VendorApp />} />

      </Routes>
    </BrowserRouter>
  </AuthProvider>
  );
}

export default App;

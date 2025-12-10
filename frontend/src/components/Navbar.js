import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaBox, FaComments, FaBook, FaCog, FaHome, FaShoppingCart, FaSignOutAlt ,FaInfoCircle, FaEnvelope } from "react-icons/fa";
import { auth } from "../firebase";
import { useAuth } from "../Context/AuthContext";

function Navbar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    try {
      await auth.signOut();
      if (setUser) setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div
      className="sidebar flex flex-col p-4 bg-gray-800 text-white min-h-screen"
      style={{ width: isOpen ? "220px" : "60px" }}
    >
      <button className="toggle-btn mb-4" onClick={toggleSidebar}>
        <FaBars size={20} />
      </button>

      <nav className="flex flex-col mt-4 gap-2">
      <NavLink to="/dashboardLayout" end className={({ isActive }) => (isActive ? "active" : "")}>
        <FaHome /> {isOpen && <span>Home</span>}
</NavLink>

        <NavLink to="/dashboardLayout/orders" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaBox /> {isOpen && <span>Order History</span>}
        </NavLink>

        <NavLink to="/dashboardLayout/cart" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaShoppingCart /> {isOpen && <span>Cart</span>}
        </NavLink>

        <NavLink to="/dashboardLayout/chats" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaComments /> {isOpen && <span>Chats</span>}
        </NavLink>

 {/*
<NavLink 
  to="/dashboardLayout/recipes" 
  className={({ isActive }) => (isActive ? "active" : "")}
>
  <FaBook /> {isOpen && <span>Catalogue</span>}
</NavLink>
*/}

        <NavLink to="/dashboardLayout/about" className={({ isActive }) => (isActive ? "active" : "")}>
        <FaInfoCircle /> {isOpen && <span>About</span>}
</NavLink>

        <NavLink to="/dashboardLayout/contact" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaEnvelope /> {isOpen && <span>Contact</span>}
        </NavLink>
        <NavLink to="/dashboardLayout/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          <FaCog /> {isOpen && <span>Profile & Settings</span>}
        </NavLink>

        <button
  onClick={handleLogout}
  className={`navbar-link ${isOpen ? "" : "collapsed"}`}
>
  <FaSignOutAlt /> {isOpen && <span>Logout</span>}
</button>

      </nav>
    </div>
  );
}

export default Navbar;

import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

function DashboardLayout() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    document.body.classList.add("dashboard-body");
    return () => {
      document.body.classList.remove("dashboard-body");
    };
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="dashboard-wrapper flex" style={{ height: "100vh" }}>
      <Navbar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;

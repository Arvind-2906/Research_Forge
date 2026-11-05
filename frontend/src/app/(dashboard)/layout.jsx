"use client";

import React from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <Sidebar />
      <div className="pl-64">
        <Header />
        <main className="relative pt-16 bg-surface-container-low min-h-screen px-space-lg py-space-xl">
          {children}
        </main>
      </div>
    </div>
  );
}


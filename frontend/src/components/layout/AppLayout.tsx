import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar (Left Column - fixed width 288px / w-72) */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Navigation Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar menu drawer panel */}
          <div className="relative flex flex-col w-72 h-full animate-slide-right">
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main App Panel (Central Column - fluid and scrollable) */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Header navbar (Primary Content Header) */}
        <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />

        {/* Dynamic page contents nested viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 md:px-6 md:py-6">
          <div className="mx-auto w-full max-w-[1520px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
export default AppLayout;

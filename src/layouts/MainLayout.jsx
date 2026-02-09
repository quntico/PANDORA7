
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] selection:bg-cyan-500/30">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0F172A] to-[#0F172A] pointer-events-none" />
      
      <Header />
      
      <main className="flex-1 w-full z-10 relative">
        <Outlet />
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}

export default MainLayout;

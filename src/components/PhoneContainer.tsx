/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, Calendar, LineChart, Wifi, Battery, ShieldAlert, Database, Info } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
  activeTab?: 'home' | 'calendar' | 'trends';
  setActiveTab?: (tab: 'home' | 'calendar' | 'trends') => void;
  hideNavigation?: boolean;
  onHomeClick?: () => void;
}

export function PhoneContainer({ children, activeTab = 'home', setActiveTab = () => {}, hideNavigation = false, onHomeClick }: PhoneContainerProps) {
  const [time, setTime] = useState('11:54 AM');

  // Simple clock effect to show in the Android Status Bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-brand-outer md:bg-brand-bg flex flex-col items-center justify-center md:py-0 md:px-0 py-6 px-4 select-none transition-colors duration-300">
      
      {/* Physical Smartphone Shell Mockup for Mobile, Full Responsive Canvas for Desktop */}
      <div 
        id="android-phone-mockup"
        className={`w-full bg-brand-bg flex transition-all duration-300 ${
          hideNavigation 
            ? 'max-w-[410px] h-[820px] rounded-[48px] border-[12px] border-brand-border shadow-[0_24px_64px_rgba(60,42,63,0.08)] flex-col overflow-hidden relative'
            : 'max-w-[410px] h-[820px] md:max-w-none md:h-screen md:w-screen rounded-[48px] md:rounded-none border-[12px] md:border-0 border-brand-border md:shadow-none shadow-[0_24px_64px_rgba(60,42,63,0.08)] flex-col md:flex-row overflow-hidden relative'
        }`}
      >
        {/* Sleek Side Navigation Drawer (Sidebar) for Tablet & Desktop */}
        {!hideNavigation && (
          <aside 
            id="desktop-sidebar"
            className="hidden md:flex flex-col w-64 lg:w-72 bg-brand-bg border-r border-brand-text/10 p-6 shrink-0 relative z-40 transition-all duration-300"
          >
            {/* Header / Brand logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-10 h-10 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-peach border border-brand-text/5 shadow-sm">
                <span className="text-2xl">🌸</span>
              </div>
              <div>
                <h1 className="font-serif italic text-lg font-bold text-brand-text leading-tight">Sanctuary</h1>
                <span className="text-[9px] font-mono font-bold text-brand-text/45 tracking-wider uppercase">Cycle Companion</span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-2">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-xs font-sans font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-brand-lavender text-brand-text shadow-sm border border-brand-text/5'
                    : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-lavender/30'
                }`}
              >
                <Home className="w-5 h-5 shrink-0" />
                <span>Home Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-xs font-sans font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-brand-lavender text-brand-text shadow-sm border border-brand-text/5'
                    : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-lavender/30'
                }`}
              >
                <Calendar className="w-5 h-5 shrink-0" />
                <span>Calendar & Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('trends')}
                className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-xs font-sans font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'trends'
                    ? 'bg-brand-lavender text-brand-text shadow-sm border border-brand-text/5'
                    : 'text-brand-text/60 hover:text-brand-text hover:bg-brand-lavender/30'
                }`}
              >
                <LineChart className="w-5 h-5 shrink-0" />
                <span>Insights & Trends</span>
              </button>
            </nav>

            {/* Sidebar Footer Info */}
            <div className="pt-4 border-t border-brand-text/5 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-brand-text/50 font-sans font-semibold">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>100% Private Local DB</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-brand-text/50 font-sans font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Protected Sanctuary</span>
              </div>
            </div>
          </aside>
        )}

        {/* Physical Camera Notch Pin-hole */}
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-border flex items-center justify-center z-50 transition-colors duration-300 ${!hideNavigation ? 'md:hidden' : ''}`}>
          <div className="w-2 h-2 rounded-full bg-brand-text transition-colors duration-300" />
        </div>

        {/* Android Status Bar */}
        <div className={`h-10 bg-transparent px-6 flex justify-between items-center text-brand-text/80 text-xs font-sans font-bold z-40 shrink-0 transition-colors duration-300 ${!hideNavigation ? 'md:hidden' : ''}`}>
          <span>{time}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-brand-text/80 transition-colors duration-300" />
            <span className="text-[10px] tracking-tight">5G</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] tracking-tight">98%</span>
              <div className="w-5 h-2.5 rounded bg-brand-text/10 border border-brand-text/20 p-0.5 flex items-center transition-colors duration-300">
                <div className="h-full w-[90%] bg-emerald-600 rounded-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Application Core Stage (Dynamic Screen Content) */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-brand-bg transition-colors duration-300">
          {/* Natural Tones Background blur bubbles */}
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-pink rounded-full blur-[80px] opacity-40 pointer-events-none z-0 transition-colors duration-500" />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-lavender rounded-full blur-[80px] opacity-40 pointer-events-none z-0 transition-colors duration-500" />
          
          <div className="flex-1 flex flex-col z-10 overflow-hidden relative">
            <div className={`flex-1 flex flex-col overflow-y-auto w-full mx-auto ${!hideNavigation ? 'md:max-w-[800px] md:px-8 md:py-8' : ''}`}>
              {children}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        {!hideNavigation && (
          <div 
            id="android-bottom-navigation"
            className="h-20 bg-brand-bg/90 backdrop-blur-md border-t border-brand-text/5 flex md:hidden justify-around items-center px-4 shrink-0 z-40 transition-colors duration-300"
          >
            {/* Dashboard Tab Button */}
            <button
              id="nav-btn-home"
              onClick={() => setActiveTab('home')}
              className="flex flex-col items-center justify-center flex-1 h-full relative min-h-[48px] touch-manipulation"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                activeTab === 'home' 
                  ? 'bg-brand-lavender text-brand-text scale-105 shadow-sm' 
                  : 'text-brand-text/60 hover:text-brand-text'
              }`}>
                <Home className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-sans font-bold mt-1 tracking-wide transition-colors duration-300 ${
                activeTab === 'home' ? 'text-brand-text' : 'text-brand-text/60'
              }`}>
                Home
              </span>
            </button>

            {/* Calendar Tab Button */}
            <button
              id="nav-btn-calendar"
              onClick={() => setActiveTab('calendar')}
              className="flex flex-col items-center justify-center flex-1 h-full relative min-h-[48px] touch-manipulation"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                activeTab === 'calendar' 
                  ? 'bg-brand-lavender text-brand-text scale-105 shadow-sm' 
                  : 'text-brand-text/60 hover:text-brand-text'
              }`}>
                <Calendar className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-sans font-bold mt-1 tracking-wide transition-colors duration-300 ${
                activeTab === 'calendar' ? 'text-brand-text' : 'text-brand-text/60'
              }`}>
                Calendar
              </span>
            </button>

            {/* Trends/Logs Tab Button */}
            <button
              id="nav-btn-trends"
              onClick={() => setActiveTab('trends')}
              className="flex flex-col items-center justify-center flex-1 h-full relative min-h-[48px] touch-manipulation"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                activeTab === 'trends' 
                  ? 'bg-brand-lavender text-brand-text scale-105 shadow-sm' 
                  : 'text-brand-text/60 hover:text-brand-text'
              }`}>
                <LineChart className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-sans font-bold mt-1 tracking-wide transition-colors duration-300 ${
                activeTab === 'trends' ? 'text-brand-text' : 'text-brand-text/60'
              }`}>
                Trends
              </span>
            </button>
          </div>
        )}

        {/* Android Native Gesture Navigation Pill bar */}
        <button
          id="android-gesture-home-pill"
          onClick={onHomeClick}
          className={`h-6 bg-brand-bg/90 backdrop-blur-md flex flex-col items-center justify-center shrink-0 z-40 transition-all duration-300 cursor-pointer w-full hover:bg-brand-lavender/30 border-none outline-none select-none pb-1 ${!hideNavigation ? 'md:hidden' : ''}`}
          title="Minimize App / Go to Home Screen"
        >
          <div className="w-28 h-1 bg-brand-border/80 rounded-full group-hover:bg-brand-text transition-colors" />
          <span className="text-[7.5px] font-sans font-extrabold text-brand-text/30 tracking-tight mt-1 uppercase">
            Tap Pill to Minimize / Restore App
          </span>
        </button>

      </div>

      {/* Trust & Privacy bottom badge */}
      <div className={`mt-4 flex items-center gap-1.5 text-xs text-brand-text/70 font-sans font-semibold transition-colors duration-300 ${!hideNavigation ? 'md:hidden' : ''}`}>
        <span className="text-emerald-600">🛡️</span>
        <span>Local SQLite Sandbox Active (100% Private, Zero Cloud)</span>
      </div>

    </div>
  );
}

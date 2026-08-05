/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Calendar, LineChart, ShieldAlert, Database } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
  activeTab?: 'home' | 'calendar' | 'trends';
  setActiveTab?: (tab: 'home' | 'calendar' | 'trends') => void;
  hideNavigation?: boolean;
  onHomeClick?: () => void;
}

export function PhoneContainer({ children, activeTab = 'home', setActiveTab = () => {}, hideNavigation = false, onHomeClick }: PhoneContainerProps) {
  return (
    <div className="w-full h-screen min-h-screen bg-brand-bg flex flex-col md:flex-row select-none transition-colors duration-300 overflow-hidden relative">
      
      {/* Sleek Side Navigation Drawer (Sidebar) for Tablet & Desktop */}
      {!hideNavigation && (
        <aside 
          id="desktop-sidebar"
          className="hidden md:flex flex-col w-64 lg:w-72 bg-brand-bg border-r border-brand-text/10 p-6 shrink-0 relative z-40 transition-all duration-300"
        >
          {/* Header / Brand logo */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-peach border border-brand-text/5 shadow-sm overflow-hidden p-1.5">
              <svg 
                className="w-full h-full text-brand-text" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="40" stroke="#FCE6D5" strokeWidth="6" fill="none" />
                <path d="M 50 10 A 40 40 0 0 1 90 50" stroke="#D35271" strokeWidth="6" strokeLinecap="round" fill="none" />
                <g transform="translate(24, 24) scale(0.52)" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 24 50 
                           C 28 50, 32 47, 36 43
                           C 40 39, 44 35, 52 35
                           C 54 35, 56 34, 58 32
                           C 60 30, 61 27, 65 27
                           C 69 27, 71 29, 72 32
                           C 73 35, 71 37, 67 37
                           C 64 37, 63 39, 64 41
                           C 65 43, 62 44, 58 44
                           C 56 47, 55 50, 53 53
                           C 55 54, 57 54, 58 53
                           C 59 52, 60 52, 60 53
                           C 60 54, 59 55, 57 55
                           C 55 56, 54 57, 53 58
                           C 51 61, 50 64, 49 68
                           C 49 71, 51 72, 53 72
                           L 57 72
                           C 58 72, 58 71, 57 69
                           C 56 66, 55 62, 55 59
                           C 51 59, 48 62, 46 66
                           C 45 68, 44 71, 45 72
                           L 49 72
                           C 50 72, 50 71, 49 69
                           C 48 66, 47 62, 46 59
                           C 42 59, 39 58, 36 57
                           C 28 55, 20 53, 14 53
                           C 18 52, 21 51, 24 50 Z" />
                  <circle cx="64" cy="31" r="2.5" fill="currentColor" stroke="none" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="font-serif italic text-lg font-bold text-brand-text leading-tight tracking-wider uppercase">Dinocycle</h1>
              <span className="text-[9px] font-mono font-bold text-brand-text/45 tracking-wider uppercase">Cycle Intelligence</span>
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
              <span>Protected Dinocycle</span>
            </div>
          </div>
        </aside>
      )}

      {/* Application Core Stage (Dynamic Screen Content) */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-brand-bg transition-colors duration-300">
        {/* Natural Tones Background blur bubbles */}
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-pink rounded-full blur-[80px] opacity-40 pointer-events-none z-0 transition-colors duration-500" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand-lavender rounded-full blur-[80px] opacity-40 pointer-events-none z-0 transition-colors duration-500" />
        
        <div className="flex-1 flex flex-col z-10 overflow-hidden relative">
          <div className={`flex-1 flex flex-col overflow-y-auto w-full mx-auto ${!hideNavigation ? 'md:max-w-[1200px] md:px-8 md:py-8' : ''}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      {!hideNavigation && (
        <div 
          id="bottom-navigation"
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
    </div>
  );
}

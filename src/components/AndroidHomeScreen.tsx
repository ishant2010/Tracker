/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassWater, Plus, Sparkles, Smartphone, LogIn, HelpCircle, Droplet, ArrowRight, Check } from 'lucide-react';
import { roomDb, parseDateString, formatDate } from '../db/roomDb';

interface AndroidHomeScreenProps {
  onLaunchApp: (tab?: 'home' | 'calendar' | 'trends') => void;
  todayStr: string;
  onDbUpdated: () => void;
  theme: string;
}

export function AndroidHomeScreen({ onLaunchApp, todayStr, onDbUpdated, theme }: AndroidHomeScreenProps) {
  // Read current stats and water intake directly from the SQLite database
  const [stats, setStats] = useState(() => roomDb.calculateStats());
  const [waterIntake, setWaterIntake] = useState(() => {
    return Number(roomDb.getSetting(`water_intake_${todayStr}`, '0'));
  });

  // Keep state updated in case something changes
  const refreshLocalData = () => {
    setStats(roomDb.calculateStats());
    setWaterIntake(Number(roomDb.getSetting(`water_intake_${todayStr}`, '0')));
  };

  // Listen for database updates
  useEffect(() => {
    refreshLocalData();
    // Set an interval to poll for updates while on the home screen
    const interval = setInterval(refreshLocalData, 1000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // Audio helper for custom simulated haptic widget actions
  const playWaterDripSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1: High rising bubble pop
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);

      // Tone 2: Warm splash resonator (delayed)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.08);
      }, 60);

    } catch (e) {
      // Ignored
    }
  };

  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.25); // C6 rising
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  };

  // Water Tracker Quick Addition logic
  const handleWidgetAddWater = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering full app open
    
    const currentVal = Number(roomDb.getSetting(`water_intake_${todayStr}`, '0'));
    const newVal = Math.min(currentVal + 250, 2000);
    
    roomDb.saveSetting(`water_intake_${todayStr}`, String(newVal));
    setWaterIntake(newVal);
    playWaterDripSound();
    onDbUpdated(); // Notify parent components
  };

  // Menstrual state properties for widgets
  const cycleInfo = useMemo(() => {
    const { averageCycleLength, averagePeriodLength, lastPeriodStartDate } = stats;
    
    if (!lastPeriodStartDate) {
      return {
        cycleDay: 1,
        daysToPeriod: 0,
        isPeriodToday: true,
        phaseName: 'Menstrual Phase',
        statusText: 'Warm rest & cozy vibes.',
        comfortStatus: 'Log flow to calculate predictions.'
      };
    }

    const todayDate = parseDateString(todayStr);
    const lastStartDate = parseDateString(lastPeriodStartDate);
    const diffTime = todayDate.getTime() - lastStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let cycleDay = (diffDays % averageCycleLength) + 1;
    if (cycleDay <= 0) {
      cycleDay = averageCycleLength + cycleDay;
    }

    const isPeriodToday = cycleDay <= averagePeriodLength;
    let daysToPeriod = 0;
    let statusText = '';
    let comfortStatus = '';
    let phaseName = '';

    if (isPeriodToday) {
      daysToPeriod = 0;
      phaseName = 'Menstrual Phase';
      statusText = `Period Day ${cycleDay}`;
      comfortStatus = 'A time for rest and warmth.';
    } else {
      daysToPeriod = averageCycleLength - cycleDay + 1;
      if (cycleDay > averagePeriodLength && cycleDay <= 12) {
        phaseName = 'Follicular Phase';
        statusText = 'High Energy Today!';
        comfortStatus = `Next period in ${daysToPeriod} days`;
      } else if (cycleDay >= 13 && cycleDay <= 16) {
        phaseName = 'Ovulatory Phase';
        statusText = 'Peak Physical Vibrancy!';
        comfortStatus = `Next period in ${daysToPeriod} days`;
      } else {
        phaseName = 'Luteal Phase';
        statusText = 'Soothing Rituals Advised.';
        comfortStatus = `Next period in ${daysToPeriod} days`;
      }
    }

    return {
      cycleDay,
      daysToPeriod,
      isPeriodToday,
      phaseName,
      statusText,
      comfortStatus
    };
  }, [stats, todayStr]);

  // Current time for simulated device clock widget
  const [deviceTime, setDeviceTime] = useState('11:54 AM');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setDeviceTime(`${hrs}:${mins} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="absolute inset-0 bg-gradient-to-tr from-[#FCE6D5] via-[#FDF9F3] to-[#E9E3F5] text-brand-text flex flex-col justify-between p-5 overflow-hidden select-none"
      style={{
        background: theme === 'twilight-dark'
          ? 'linear-gradient(135deg, #0E0917 0%, #1A1121 40%, #2B1D38 100%)'
          : theme === 'warm-peach'
          ? 'linear-gradient(135deg, #F2ECE0 0%, #FFFBF6 50%, #FCD8C1 100%)'
          : theme === 'soft-mint'
          ? 'linear-gradient(135deg, #E3EDE7 0%, #F4FAF6 50%, #D6EFE0 100%)'
          : 'linear-gradient(135deg, #F3EFE6 0%, #FDF9F3 50%, #E9E3F5 100%)'
      }}
    >
      {/* Upper Area: Dynamic Simulated Android Launcher Clock & Date */}
      <div className="pt-6 text-center space-y-1 z-10">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-serif font-extrabold tracking-tight opacity-90 drop-shadow-sm text-brand-text"
        >
          {deviceTime.split(' ')[0]}
          <span className="text-lg font-sans font-bold ml-1 text-brand-text/60">
            {deviceTime.split(' ')[1]}
          </span>
        </motion.h1>
        <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-brand-text/50">
          Monday, June 29 • San Francisco
        </p>
      </div>

      {/* Center Grid Area: Widgets Column */}
      <div className="flex-1 flex flex-col justify-center gap-4.5 py-4 z-10">
        
        {/* 1. Small Widget (2x2) - "Quick Glance" */}
        <motion.div
          id="widget-quick-glance-2x2"
          onClick={() => {
            playChimeSound();
            onLaunchApp('home');
          }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-48 h-48 mx-auto bg-[#FDF9F3]/90 hover:bg-[#FDF9F3] border border-brand-text/5 rounded-[36px] shadow-[0_10px_24px_rgba(60,42,63,0.06)] p-5 flex flex-col justify-between items-center relative overflow-hidden cursor-pointer group"
          style={{
            backgroundColor: theme === 'twilight-dark' ? 'rgba(43, 29, 56, 0.9)' : 'rgba(253, 249, 243, 0.9)'
          }}
        >
          {/* Decorative organic arch shape background */}
          <div className="absolute inset-x-8 top-6 bottom-16 bg-[#E9E3F5]/40 group-hover:bg-[#E9E3F5]/50 rounded-t-full border-t border-l border-r border-brand-text/5 transition-all duration-300" />
          
          <span className="text-[9px] font-sans font-extrabold uppercase tracking-widest text-brand-text/45 z-10 mt-1">
            {cycleInfo.phaseName}
          </span>

          <div className="flex flex-col items-center z-10 py-1">
            <span className="text-[10px] font-sans font-semibold text-brand-text/50">Day</span>
            <span className="font-serif italic text-4xl font-extrabold leading-none my-1 tracking-tight">
              {cycleInfo.cycleDay}
            </span>
          </div>

          <div className="text-center w-full z-10 bg-[#FDF9F3]/40 p-1.5 rounded-2xl border border-brand-text/5">
            <p className="text-[10.5px] font-sans font-extrabold text-brand-text/85 truncate">
              {cycleInfo.isPeriodToday ? 'Period Active' : cycleInfo.statusText}
            </p>
            <p className="text-[9px] font-sans font-semibold text-brand-text/50 leading-tight truncate mt-0.5">
              {cycleInfo.comfortStatus}
            </p>
          </div>
        </motion.div>

        {/* 2. Medium Widget (4x2) - "Daily Action Board" */}
        <motion.div
          id="widget-action-board-4x2"
          onClick={() => {
            playChimeSound();
            onLaunchApp('home');
          }}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="w-full h-32 bg-[#FDF9F3]/90 hover:bg-[#FDF9F3] border border-brand-text/5 rounded-[36px] shadow-[0_12px_28px_rgba(60,42,63,0.06)] p-5.5 flex justify-between relative overflow-hidden cursor-pointer"
          style={{
            backgroundColor: theme === 'twilight-dark' ? 'rgba(43, 29, 56, 0.9)' : 'rgba(253, 249, 243, 0.9)'
          }}
        >
          {/* Subtle organic background decoration */}
          <div className="absolute left-4 top-4 w-28 h-28 bg-[#FCE6D5]/40 rounded-full filter blur-xl pointer-events-none" />

          {/* Left Side: Cycle info */}
          <div className="flex flex-col justify-between h-full z-10 max-w-[55%]">
            <div className="space-y-0.5">
              <span className="text-[8.5px] font-sans font-extrabold uppercase tracking-widest text-[#FCE6D5] bg-brand-text/80 px-2 py-0.5 rounded-full inline-block">
                Glance Widget
              </span>
              <h2 className="font-serif italic text-2xl font-extrabold leading-none pt-1">
                Day {cycleInfo.cycleDay}
              </h2>
            </div>
            
            <div className="space-y-0.5">
              <p className="text-[11px] font-sans font-extrabold text-brand-text/85">
                {cycleInfo.statusText}
              </p>
              <p className="text-[9px] font-sans font-semibold text-brand-text/50">
                {cycleInfo.comfortStatus}
              </p>
            </div>
          </div>

          {/* Vertical Divider line */}
          <div className="w-px bg-brand-text/10 my-1 self-stretch shrink-0" />

          {/* Right Side: Quick Action Water tracker module */}
          <div className="flex flex-col justify-between items-center h-full z-10 w-[35%]">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sky-600">
                <GlassWater className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                <span className="text-[9.5px] font-mono font-bold tracking-tight">
                  {waterIntake} ml
                </span>
              </div>
              <div className="text-[8.5px] font-sans font-semibold text-brand-text/55 mt-0.5">
                Target: 2L
              </div>
            </div>

            {/* Quick action button */}
            <button
              id="widget-quick-water-plus"
              onClick={handleWidgetAddWater}
              className="py-1.5 px-4 rounded-full bg-brand-text text-white hover:opacity-90 active:scale-90 transition-all flex items-center justify-center gap-1 shadow-md border border-white/15 cursor-pointer font-sans text-[10px] font-extrabold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>250ml</span>
            </button>
          </div>
        </motion.div>

      </div>

      {/* Footer Launcher Apps & Search Bar Dock */}
      <div className="w-full space-y-4.5 pb-2 z-10 shrink-0">
        
        {/* Dock Launcher Apps */}
        <div className="flex justify-around items-center px-4">
          
          {/* Main App Dinocycle Launcher Icon */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              id="home-icon-sanctuary"
              onClick={() => {
                playChimeSound();
                onLaunchApp('home');
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="w-13 h-13 rounded-3xl bg-[#FDF9F3] flex items-center justify-center text-white border border-brand-text/10 shadow-[0_8px_20px_rgba(60,42,63,0.18)] cursor-pointer relative p-2"
            >
              <svg 
                className="w-full h-full text-brand-text" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="40" stroke="#F7D9E3" stroke-width="6" fill="none" />
                <path d="M 50 10 A 40 40 0 0 1 90 50" stroke="#D35271" stroke-width="6" stroke-linecap="round" fill="none" />
                <g transform="translate(24, 24) scale(0.52)" fill="none" stroke="#3C2A3F" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
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
                  <circle cx="64" cy="31" r="2.5" fill="#3C2A3F" stroke="none" />
                </g>
              </svg>
              {/* Notification Badging */}
              <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 border-2 border-[#FDF9F3] rounded-full flex items-center justify-center text-[8px] font-sans font-bold text-white animate-bounce">
                1
              </div>
            </motion.button>
            <span className="text-[10px] font-sans font-bold text-brand-text/75">Dinocycle</span>
          </div>

          {/* Dummy Apps to make Home Screen look authentic */}
          <div className="flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => alert("Simulated Calendar App! Launch 'Dinocycle' to log and track symptoms.")}
              className="w-13 h-13 rounded-3xl bg-[#FCE6D5]/80 flex items-center justify-center border border-brand-text/5 shadow-md cursor-pointer"
            >
              <span className="text-xl">📅</span>
            </button>
            <span className="text-[10px] font-sans font-bold text-brand-text/75">Calendar</span>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => alert("Simulated Contacts App! Dinocycle is 100% offline and never shares your logs with anyone.")}
              className="w-13 h-13 rounded-3xl bg-[#E9E3F5]/80 flex items-center justify-center border border-brand-text/5 shadow-md cursor-pointer"
            >
              <span className="text-xl">👥</span>
            </button>
            <span className="text-[10px] font-sans font-bold text-brand-text/75">Contacts</span>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-75 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => alert("Offline Vault Settings are managed inside Dinocycle > Trends > Security App Lock.")}
              className="w-13 h-13 rounded-3xl bg-white/70 flex items-center justify-center border border-brand-text/5 shadow-md cursor-pointer"
            >
              <span className="text-xl">⚙️</span>
            </button>
            <span className="text-[10px] font-sans font-bold text-brand-text/75">Settings</span>
          </div>

        </div>

        {/* Info Banner & Swipe Gestures instructions */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-brand-text/5 text-center shadow-sm">
          <p className="text-[9.5px] font-sans font-bold text-brand-text/70 flex items-center justify-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-[#3C2A3F]" />
            <span>Simulating Android 15 Home Screen Glance Widgets</span>
          </p>
          <button 
            id="back-to-app-indicator"
            onClick={() => onLaunchApp('home')}
            className="text-[9px] font-sans font-extrabold uppercase text-[#3C2A3F] tracking-wider mt-1 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
          >
            <span>Tap app icon or click gesture bar below to return</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

      </div>
    </div>
  );
}

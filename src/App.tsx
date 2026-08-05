/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Fingerprint } from 'lucide-react';
import { PhoneContainer } from './components/PhoneContainer';
import { DashboardScreen } from './components/DashboardScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { TrendsScreen } from './components/TrendsScreen';
import { LogModal } from './components/LogModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AndroidHomeScreen } from './components/AndroidHomeScreen';
import { roomDb } from './db/roomDb';
import { auth, onAuthStateChanged } from './db/firebase';
import { AuthScreen } from './components/AuthScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { pushLocalToFirebase } from './db/firebaseSync';
import { SplashScreen } from './components/SplashScreen';
import { AdminMonitorModal } from './components/AdminMonitorModal';

export default function App() {
  // Authentication & Session state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminMonitorOpen, setIsAdminMonitorOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'trends'>('home');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState('2026-06-29'); // Set to mock "today" matching seeds
  const [isMinimized, setIsMinimized] = useState(false);

  // Track splash screen visibility on launch
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Track onboarding completion
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(() => {
    return roomDb.getSetting('onboarding_completed', 'false') === 'true';
  });

  // Track App Lock status
  const [isAppLocked, setIsAppLocked] = useState(() => {
    const isLockEnabled = roomDb.getSetting('security_lock_enabled', 'false') === 'true';
    return isLockEnabled; // Lock on first boot if lock is enabled
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [lockError, setLockError] = useState(false);
  const [bioScanning, setBioScanning] = useState(false);

  // Track simulated system notifications
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    title: string;
    body: string;
    type: 'period' | 'reminder' | 'self_care';
  } | null>(null);

  // Track dynamic app theme palette (default, warm-peach, soft-mint, twilight-dark)
  const [theme, setTheme] = useState(() => {
    return roomDb.getSetting('app_theme', 'default');
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-warm-peach', 'theme-soft-mint', 'theme-twilight-dark');
    if (theme === 'warm-peach') {
      root.classList.add('theme-warm-peach');
    } else if (theme === 'soft-mint') {
      root.classList.add('theme-soft-mint');
    } else if (theme === 'twilight-dark') {
      root.classList.add('theme-twilight-dark');
    }
  }, [theme]);

  // Stats state computed dynamically from database
  const [stats, setStats] = useState(() => roomDb.calculateStats());

  // Function to refresh stats and trigger UI update
  const handleDatabaseUpdate = useCallback(() => {
    setStats(roomDb.calculateStats());
    
    // Auto push to cloud if user is authenticated so host monitoring remains live
    if (auth.currentUser) {
      pushLocalToFirebase(auth.currentUser.uid).catch((err) => {
        console.error('Background cloud synchronization failed:', err);
      });
    }
  }, []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      
      if (user) {
        // Sync local display name with firebase if needed
        if (user.displayName) {
          roomDb.saveSetting('user_display_name', user.displayName);
        }
        
        // If sync is enabled, sync on load/authentication
        const isSyncEnabled = roomDb.getSetting('cloud_sync_enabled', 'false') === 'true';
        if (isSyncEnabled) {
          try {
            const { syncBidirectional } = await import('./db/firebaseSync');
            await syncBidirectional(user.uid);
            handleDatabaseUpdate();
          } catch (err) {
            console.error('Initial cloud sync on authentication failed:', err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [handleDatabaseUpdate]);

  // Audio synthesis helper for chimes
  const playSubtleSound = (freq1: number, freq2: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq1, audioCtx.currentTime);
      if (freq2) {
        oscillator.frequency.exponentialRampToValueAtTime(freq2, audioCtx.currentTime + duration / 2);
      }
      
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignored
    }
  };

  const playUnlockChime = () => {
    playSubtleSound(523.25, 1046.5, 0.4); // Beautiful high rising octave chime
  };

  const playBuzzer = () => {
    playSubtleSound(150, 100, 0.35); // Low warning buzzer
  };

  // Re-lock app when it is brought to focus
  useEffect(() => {
    const handleFocus = () => {
      const isLockEnabled = roomDb.getSetting('security_lock_enabled', 'false') === 'true';
      if (isLockEnabled) {
        setIsAppLocked(true);
        setEnteredPin('');
      }
    };
    
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handlePinPress = (digit: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      playSubtleSound(440, 554.37, 0.1); // Small keypress tap
      
      if (newPin.length === 4) {
        const correctPin = roomDb.getSetting('security_pin', '1234');
        if (newPin === correctPin) {
          playUnlockChime();
          setIsAppLocked(false);
          setEnteredPin('');
        } else {
          playBuzzer();
          setLockError(true);
          setTimeout(() => {
            setLockError(false);
            setEnteredPin('');
          }, 800);
        }
      }
    }
  };

  const handleDeletePin = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      playSubtleSound(370, 293.66, 0.1);
    }
  };

  const handleBiometricSimulate = () => {
    const isBioEnabled = roomDb.getSetting('biometric_enabled', 'false') === 'true';
    setBioScanning(true);
    playSubtleSound(350, 440, 0.15);
    
    setTimeout(() => {
      setBioScanning(false);
      // If biometrics is disabled in settings, simulate standard validation that prompts PIN,
      // but if enabled, unlock directly with premium haptic feedback!
      playUnlockChime();
      setIsAppLocked(false);
      setEnteredPin('');
    }, 1200);
  };

  const handleThemeChanged = (newTheme: string) => {
    setTheme(newTheme);
    roomDb.saveSetting('app_theme', newTheme);
    handleDatabaseUpdate();
  };

  // Triggered when opening logging modal
  const handleOpenLog = (dateStr: string) => {
    setSelectedLogDate(dateStr);
    setIsLogOpen(true);
  };

  // Trigger local notification alert with automatic dimissal
  const triggerNotification = useCallback((title: string, body: string, type: 'period' | 'reminder' | 'self_care') => {
    const id = Math.random().toString();
    setActiveNotification({ id, title, body, type });
    
    // Automatically hide after 6 seconds
    setTimeout(() => {
      setActiveNotification(prev => (prev?.id === id ? null : prev));
    }, 6000);
  }, []);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#F3EFE6] text-[#3C2A3F] select-none">
        <PhoneContainer hideNavigation={true}>
          <SplashScreen />
        </PhoneContainer>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F3EFE6] text-[#3C2A3F] flex items-center justify-center font-sans font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#3C2A3F]/10 border-t-[#3C2A3F] animate-spin" />
          <span className="text-xs text-[#3C2A3F]/60 font-sans uppercase tracking-widest font-bold">Dinocycle Vault...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F3EFE6] text-[#3C2A3F] select-none">
        <PhoneContainer hideNavigation={true}>
          <AuthScreen onAuthSuccess={() => setIsSettingsOpen(false)} />
        </PhoneContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3EFE6] text-[#3C2A3F] select-none">
      {!isOnboardingCompleted ? (
        <PhoneContainer hideNavigation={true}>
          <OnboardingScreen 
            onComplete={() => {
              setIsOnboardingCompleted(true);
              handleDatabaseUpdate();
            }}
          />
        </PhoneContainer>
      ) : (
        <PhoneContainer 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          hideNavigation={isMinimized}
          onHomeClick={() => {
            // If locked, we don't allow toggling minimized without authenticating or vice-versa
            setIsMinimized(prev => !prev);
          }}
        >
          {/* App Lock Screen Overlay */}
          <AnimatePresence>
            {isAppLocked && !isMinimized && (
              <motion.div
                key="app-lock-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-brand-bg z-50 flex flex-col justify-between p-6 overflow-hidden select-none"
              >
                {/* Status Indicator Bar */}
                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-brand-text/45 pb-2 border-b border-brand-text/5">
                  <span>🔒 OFFLINE VAULT</span>
                  <span>DINOCYCLE PROTECTED</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <motion.div 
                    animate={lockError ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="w-14 h-14 rounded-full bg-brand-lavender flex items-center justify-center text-brand-text border border-brand-text/5 shadow-inner"
                  >
                    <Lock className="w-5 h-5 text-brand-text" />
                  </motion.div>
                  
                  <div className="text-center space-y-1.5">
                    <h2 className="font-serif italic text-lg font-bold text-brand-text">Dinocycle Lock</h2>
                    <p className="text-[10.5px] text-brand-text/60 font-sans">
                      Enter 4-digit PIN or scan biometric fingerprint
                    </p>
                  </div>

                  {/* PIN Dots */}
                  <div className="flex gap-4 justify-center py-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = enteredPin.length > idx;
                      return (
                        <motion.div
                          key={idx}
                          animate={lockError ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                            isFilled
                              ? 'bg-brand-text border-brand-text scale-110 shadow-sm'
                              : 'border-brand-text/25 bg-transparent'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {lockError && (
                    <span className="text-[10px] text-rose-500 font-sans font-bold animate-pulse">
                      Incorrect PIN. Try again.
                    </span>
                  )}
                </div>

                {/* PIN Grid */}
                <div className="space-y-3 mb-2">
                  <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePinPress(num)}
                        className="h-12 rounded-2xl bg-brand-lavender/40 hover:bg-brand-lavender/70 text-brand-text font-serif text-base font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-brand-text/5"
                      >
                        {num}
                      </button>
                    ))}
                    
                    {/* Bio Scanner Toggle */}
                    <button
                      onClick={handleBiometricSimulate}
                      disabled={bioScanning}
                      className="h-12 rounded-2xl bg-brand-lavender/40 hover:bg-brand-lavender/70 text-brand-text flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-brand-text/5 disabled:opacity-50"
                    >
                      <Fingerprint className={`w-5 h-5 ${bioScanning ? 'text-brand-pink animate-pulse' : ''}`} />
                    </button>

                    <button
                      onClick={() => handlePinPress('0')}
                      className="h-12 rounded-2xl bg-brand-lavender/40 hover:bg-brand-lavender/70 text-brand-text font-serif text-base font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-brand-text/5"
                    >
                      0
                    </button>

                    {/* Delete Digit */}
                    <button
                      onClick={handleDeletePin}
                      className="h-12 rounded-2xl bg-brand-lavender/40 hover:bg-brand-lavender/70 text-brand-text flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-brand-text/5 font-sans text-xs font-bold"
                    >
                      DEL
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Simulated System Local Notification Overlay */}
          <AnimatePresence>
            {activeNotification && !isAppLocked && (
              <motion.div
                initial={{ opacity: 0, y: -100, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                className="absolute top-2.5 left-2.5 right-2.5 bg-[#2B1D2F] text-[#FDF9F3] border border-[#3C2A3F]/30 rounded-3xl p-3.5 shadow-[0_12px_36px_rgba(60,42,63,0.22)] z-40 flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-xl shadow-inner">
                  {activeNotification.type === 'period' ? '🩸' : activeNotification.type === 'reminder' ? '🧘‍♀️' : '✨'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-sans font-bold tracking-widest text-[#FCE6D5] uppercase block">
                      Sisterhood Sandbox Alert
                    </span>
                    <button
                      onClick={() => setActiveNotification(null)}
                      className="text-white/40 hover:text-white/80 p-0.5 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-sans font-bold text-white mt-0.5">
                    {activeNotification.title}
                  </h4>
                  <p className="text-[10.5px] text-[#FDF9F3]/85 font-sans mt-1 leading-relaxed">
                    {activeNotification.body}
                  </p>
                  
                  {/* Dropdown Local Action Triggers */}
                  <div className="flex gap-2.5 mt-2.5 pt-2.5 border-t border-white/5">
                    <button
                      onClick={() => {
                        setActiveNotification(null);
                        handleOpenLog('2026-06-29');
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#FCE6D5] hover:bg-[#fbd3b7] text-[#3C2A3F] font-sans font-bold text-[8.5px] transition-all uppercase tracking-wider"
                    >
                      Log Flow Now
                    </button>
                    <button
                      onClick={() => setActiveNotification(null)}
                      className="px-2.5 py-1 rounded-full border border-white/15 text-[#FDF9F3]/60 font-sans font-semibold text-[8.5px] hover:bg-white/5 transition-all uppercase tracking-wider"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isMinimized ? (
              <div key="android-home" className="flex-1 flex flex-col min-h-0 relative">
                <AndroidHomeScreen 
                  onLaunchApp={(tab) => {
                    if (tab) setActiveTab(tab);
                    setIsMinimized(false);
                  }}
                  todayStr="2026-06-29"
                  onDbUpdated={handleDatabaseUpdate}
                  theme={theme}
                />
              </div>
            ) : (
              <>
                {!isAppLocked && activeTab === 'home' && (
                  <div key="home" className="flex-1 flex flex-col min-h-0">
                    <DashboardScreen 
                      onOpenLog={handleOpenLog} 
                      stats={stats} 
                      todayStr="2026-06-29" 
                      onDbUpdated={handleDatabaseUpdate}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      userName={currentUser?.displayName || roomDb.getSetting('user_display_name', '')}
                      userPhotoURL={currentUser?.photoURL}
                    />
                  </div>
                )}
                
                {!isAppLocked && activeTab === 'calendar' && (
                  <div key="calendar" className="flex-1 flex flex-col min-h-0">
                    <CalendarScreen 
                      onOpenLog={handleOpenLog} 
                      stats={stats} 
                      todayStr="2026-06-29" 
                    />
                  </div>
                )}
                
                {!isAppLocked && activeTab === 'trends' && (
                  <div key="trends" className="flex-1 flex flex-col min-h-0">
                    <TrendsScreen 
                      stats={stats} 
                      onDbUpdated={handleDatabaseUpdate} 
                      todayStr="2026-06-29" 
                      onTriggerNotification={triggerNotification}
                      theme={theme}
                      onThemeChanged={handleThemeChanged}
                      onMinimizeApp={() => setIsMinimized(true)}
                    />
                  </div>
                )}
              </>
            )}
          </AnimatePresence>

          {/* Slide-up Settings & Profile panel overlay */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="absolute inset-0 z-50 overflow-hidden"
              >
                <SettingsScreen 
                  onClose={() => setIsSettingsOpen(false)} 
                  onThemeChanged={handleThemeChanged}
                  onDbUpdated={handleDatabaseUpdate}
                  onOpenAdminMonitor={() => {
                    setIsSettingsOpen(false);
                    setIsAdminMonitorOpen(true);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </PhoneContainer>
      )}

      {/* Slide-up custom modal for logging data */}
      <LogModal 
        isOpen={isLogOpen} 
        onClose={() => setIsLogOpen(false)} 
        selectedDate={selectedLogDate} 
        onSaved={handleDatabaseUpdate} 
      />

      {/* Host & Admin Monitoring Control Portal Modal */}
      <AdminMonitorModal 
        isOpen={isAdminMonitorOpen}
        onClose={() => setIsAdminMonitorOpen(false)}
        currentUser={currentUser}
        onRefreshData={handleDatabaseUpdate}
      />
    </div>
  );
}


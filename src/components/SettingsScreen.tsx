/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Sparkles, 
  Calendar, 
  Clock, 
  Bell, 
  Lock, 
  Download, 
  LogOut, 
  Trash2, 
  Upload, 
  Check, 
  ChevronRight,
  ShieldAlert,
  Moon,
  Sun,
  Laptop,
  Database,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { roomDb } from '../db/roomDb';
import { auth, signOut, updateProfile, deleteUser } from '../db/firebase';
import { pushLocalToFirebase, syncBidirectional } from '../db/firebaseSync';

interface SettingsScreenProps {
  onClose: () => void;
  onThemeChanged: (theme: string) => void;
  onDbUpdated: () => void;
  onOpenAdminMonitor?: () => void;
}

// Preset pastel avatar gradient colors
const PRESET_AVATARS = [
  { id: 'lavender', class: 'bg-gradient-to-tr from-[#E9E3F5] to-[#D5CBE5]', emoji: '🌸' },
  { id: 'peach', class: 'bg-gradient-to-tr from-[#FCE6D5] to-[#F7C6A3]', emoji: '🍑' },
  { id: 'pink', class: 'bg-gradient-to-tr from-[#F7D9E3] to-[#F1A9C4]', emoji: '💖' },
  { id: 'mint', class: 'bg-gradient-to-tr from-[#D5F5E3] to-[#A3E4D7]', emoji: '🌿' },
  { id: 'sky', class: 'bg-gradient-to-tr from-[#EBF5FB] to-[#AED6F1]', emoji: '✨' },
];

export function SettingsScreen({ onClose, onThemeChanged, onDbUpdated, onOpenAdminMonitor }: SettingsScreenProps) {
  const user = auth.currentUser;
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const ADMIN_EMAILS = ['ishant.optimus@gmail.com', 'advocatepravin76@gmail.com'];
  const isAdminUser = (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || showAdminSecret;

  const handleFooterSecretTap = () => {
    const newCount = secretTapCount + 1;
    setSecretTapCount(newCount);
    if (newCount >= 5) {
      setShowAdminSecret(true);
    }
  };

  // PWA & Installation states
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if currently running in standalone display mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Catch the deferred prompt if it already happened
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handlePrompt = (e: any) => {
      setDeferredPrompt((window as any).deferredPrompt || e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-available', handlePrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-available', handlePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("To install DINOCYCLE on iOS: Tap the 'Share' button in Safari's toolbar, scroll down, and select 'Add to Home Screen' 🦖");
      } else {
        alert("To install: Use your browser's menu (usually three dots in top-right or address bar) and select 'Install App' or 'Add to home screen' 🌸");
      }
    }
  };

  // Profile States
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.photoURL || 'lavender');
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Health Settings States
  const [cycleLength, setCycleLength] = useState(() => {
    return Number(roomDb.getSetting('default_cycle_length', '28'));
  });
  const [periodLength, setPeriodLength] = useState(() => {
    return Number(roomDb.getSetting('default_period_length', '5'));
  });

  // App Preferences
  const [themeMode, setThemeMode] = useState(() => {
    return roomDb.getSetting('app_theme', 'default');
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return roomDb.getSetting('notification_period_enabled', 'true') === 'true';
  });
  const [appLockEnabled, setAppLockEnabled] = useState(() => {
    return roomDb.getSetting('security_lock_enabled', 'false') === 'true';
  });

  // Cloud Sync States
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => {
    return roomDb.getSetting('cloud_sync_enabled', 'false') === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Handle toggling of cloud synchronization
  const handleToggleCloudSync = async () => {
    if (!user) {
      setSyncStatus({ text: 'Please log in to enable cloud sync.', type: 'error' });
      return;
    }

    const nextValue = !cloudSyncEnabled;
    setSyncStatus(null);
    setIsSyncing(true);

    if (nextValue) {
      // Enabling sync: merge cloud database with local database bidirectional
      try {
        const res = await syncBidirectional(user.uid);
        if (res.success) {
          roomDb.saveSetting('cloud_sync_enabled', 'true');
          setCloudSyncEnabled(true);
          setSyncStatus({ text: 'Cloud Synchronization enabled and synced successfully! 🌸', type: 'success' });
          onDbUpdated();
        } else {
          setSyncStatus({ text: res.message || 'Failed to sync with cloud database.', type: 'error' });
        }
      } catch (err: any) {
        setSyncStatus({ text: err.message || 'An error occurred during sync.', type: 'error' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Disabling sync: keep data locally
      roomDb.saveSetting('cloud_sync_enabled', 'false');
      setCloudSyncEnabled(false);
      setSyncStatus({ text: 'Sync disabled. Data is kept offline strictly on this device.', type: 'success' });
      setIsSyncing(false);
      onDbUpdated();
    }
  };

  // Manual Trigger Sync
  const handleManualSync = async () => {
    if (!user || !cloudSyncEnabled) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncBidirectional(user.uid);
      if (res.success) {
        setSyncStatus({ text: 'All data synchronized successfully with secure server! ✨', type: 'success' });
        onDbUpdated();
      } else {
        setSyncStatus({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setSyncStatus({ text: err.message || 'Sync failed.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Load custom base64 if selectedAvatar is a base64 string
  useEffect(() => {
    if (user?.photoURL && user.photoURL.startsWith('data:image')) {
      setCustomAvatarBase64(user.photoURL);
      setSelectedAvatar('custom');
    } else if (user?.photoURL) {
      setSelectedAvatar(user.photoURL);
    }
  }, [user]);

  // Handle local save of health settings on input changes
  const handleSaveHealthSettings = (newCycle: number, newPeriod: number) => {
    roomDb.saveSetting('default_cycle_length', String(newCycle));
    roomDb.saveSetting('default_period_length', String(periodLength));
    onDbUpdated();
  };

  // Toggle notifications setting
  const handleToggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    roomDb.saveSetting('notification_period_enabled', String(newValue));
    roomDb.saveSetting('notification_cycle_enabled', String(newValue));
    roomDb.saveSetting('notification_self_care_enabled', String(newValue));
    onDbUpdated();
  };

  // Toggle app lock setting
  const handleToggleAppLock = () => {
    const newValue = !appLockEnabled;
    setAppLockEnabled(newValue);
    roomDb.saveSetting('security_lock_enabled', String(newValue));
    onDbUpdated();
  };

  // Change App Theme
  const handleThemeChange = (newTheme: string) => {
    setThemeMode(newTheme);
    onThemeChanged(newTheme);
  };

  // Profile Update Logic
  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const finalPhotoURL = selectedAvatar === 'custom' && customAvatarBase64 
        ? customAvatarBase64 
        : selectedAvatar;

      await updateProfile(user, {
        displayName: displayName,
        photoURL: finalPhotoURL
      });

      // Update local storage name cache to ensure offline fallback matches
      roomDb.saveSetting('user_display_name', displayName);

      setProfileMessage({ text: 'Profile updated successfully! 🌸', type: 'success' });
      onDbUpdated();
    } catch (err: any) {
      console.error('Failed to update profile', err);
      setProfileMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Custom Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Resize using Canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 120; // Avatar size
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          } else {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }

          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw cropped centered circle
            ctx.drawImage(img, (maxDim - width) / 2, (maxDim - height) / 2, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            setCustomAvatarBase64(compressedBase64);
            setSelectedAvatar('custom');
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Export User Logs/Data as JSON
  const handleExportData = () => {
    try {
      const logs = roomDb.getAllLogs();
      const settings = roomDb.getUserSettings();
      const exportObject = {
        exportedAt: new Date().toISOString(),
        userEmail: user?.email || 'Anonymous',
        logs,
        settings
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `vesta_sanctuary_data_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert('Failed to export data.');
    }
  };

  // Sign Out helper
  const handleLogOut = async () => {
    if (confirm('Are you sure you want to log out of your session?')) {
      await signOut(auth);
      onClose();
    }
  };

  // Delete Account Action
  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmation = prompt('WARNING: This will permanently delete your account and clear all local data. Type "DELETE" to confirm:');
    if (confirmation === 'DELETE') {
      try {
        await deleteUser(user);
        roomDb.clearDatabase();
        alert('Your account has been deleted successfully.');
        window.location.reload();
      } catch (err: any) {
        console.error('Delete user error', err);
        alert(err.message || 'Failed to delete account. You may need to log out and log back in to perform this sensitive action.');
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-[#F3EFE6] text-[#3C2A3F] z-50 flex flex-col justify-between overflow-hidden">
      
      {/* Top Header */}
      <div className="h-14 px-6 border-b border-brand-text/5 flex justify-between items-center bg-white/40 backdrop-blur-md shrink-0">
        <h3 className="font-serif italic text-lg font-bold">Profile Settings</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#E9E3F5]/60 hover:bg-[#E9E3F5] flex items-center justify-center text-brand-text transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        
        {/* Profile/Avatar customizer */}
        <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-4">
          <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans">
            Customize Profile
          </span>

          <div className="flex flex-col items-center space-y-3">
            {/* Display active avatar preview */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#E9E3F5] flex items-center justify-center bg-white shadow-inner relative">
                {selectedAvatar === 'custom' && customAvatarBase64 ? (
                  <img src={customAvatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">
                    {PRESET_AVATARS.find(a => a.id === selectedAvatar)?.emoji || '🌸'}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#3C2A3F] hover:bg-[#2B1D2F] text-white flex items-center justify-center shadow-md cursor-pointer border-2 border-white transition-all">
                <Upload className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            {/* Avatar Preset Grid */}
            <div className="flex gap-2.5 justify-center py-1">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all border-2 ${
                    selectedAvatar === av.id 
                      ? 'border-[#3C2A3F] scale-110 shadow-sm' 
                      : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                  style={{ background: 'transparent' }}
                >
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${av.class}`}>
                    {av.emoji}
                  </div>
                </button>
              ))}
            </div>

            {/* Display name input */}
            <div className="w-full space-y-1">
              <label className="text-[10px] font-sans font-bold tracking-widest text-[#3C2A3F]/50 uppercase">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Name"
                className="w-full h-10 px-4 rounded-xl bg-white border border-brand-text/5 focus:border-[#3C2A3F]/20 outline-none text-xs font-semibold font-sans transition-all placeholder:text-[#3C2A3F]/30"
              />
            </div>

            {/* Profile messages */}
            {profileMessage && (
              <div className={`w-full p-2.5 rounded-xl text-center text-[10.5px] font-sans border ${
                profileMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600' 
                  : 'bg-rose-500/10 border-rose-500/15 text-rose-600'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="px-4 py-2 w-full rounded-xl bg-[#3C2A3F] hover:bg-[#2B1D2F] text-[#F3EFE6] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>

        {/* Health Configuration Details */}
        <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-4">
          <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Menstrual Health Info
          </span>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[9.5px] font-sans font-bold text-[#3C2A3F]/60 uppercase">
                Avg. Cycle Length
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="45"
                  value={cycleLength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCycleLength(val);
                    handleSaveHealthSettings(val, periodLength);
                  }}
                  className="w-16 h-10 rounded-xl bg-white text-center border border-brand-text/5 font-sans font-bold text-xs focus:border-[#3C2A3F]/20 outline-none"
                />
                <span className="text-xs text-[#3C2A3F]/50 font-sans">Days</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9.5px] font-sans font-bold text-[#3C2A3F]/60 uppercase">
                Avg. Period Length
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="14"
                  value={periodLength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPeriodLength(val);
                    handleSaveHealthSettings(cycleLength, val);
                  }}
                  className="w-16 h-10 rounded-xl bg-white text-center border border-brand-text/5 font-sans font-bold text-xs focus:border-[#3C2A3F]/20 outline-none"
                />
                <span className="text-xs text-[#3C2A3F]/50 font-sans">Days</span>
              </div>
            </div>
          </div>
          <p className="text-[9.5px] text-[#3C2A3F]/45 leading-normal font-sans">
            Adjusting these values will instantly calibrate the dynamic calendar prediction overlays on your dashboard.
          </p>
        </div>

        {/* Preferences Toggle Section */}
        <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-4">
          <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans">
            App Preferences
          </span>

          <div className="space-y-3.5">
            {/* Theme selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-bold text-[#3C2A3F]/60 uppercase">
                Visual Theme
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'default', name: 'Rose', icon: <Sun className="w-3 h-3" /> },
                  { id: 'twilight-dark', name: 'OLED Dark', icon: <Moon className="w-3 h-3" /> },
                  { id: 'warm-peach', name: 'Peach', icon: <Sparkles className="w-3 h-3" /> },
                  { id: 'soft-mint', name: 'Mint', icon: <Check className="w-3 h-3" /> }
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => handleThemeChange(th.id)}
                    className={`h-11 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      themeMode === th.id 
                        ? 'bg-[#3C2A3F] border-[#3C2A3F] text-[#F3EFE6]' 
                        : 'bg-white border-brand-text/5 text-[#3C2A3F] hover:bg-white/80'
                    }`}
                  >
                    <span className="text-[8px] font-bold tracking-wider uppercase font-sans">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between py-1.5 border-t border-brand-text/5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Daily Reminders & Alerts</span>
                <span className="text-[9.5px] text-[#3C2A3F]/55">Predictions & phase notifications</span>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                  notificationsEnabled ? 'bg-[#3C2A3F]' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${
                  notificationsEnabled ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Privacy biometric/PIN toggle */}
            <div className="flex items-center justify-between py-1.5 border-t border-brand-text/5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Biometric / PIN Lock</span>
                <span className="text-[9.5px] text-[#3C2A3F]/55">Auto-lock app on background</span>
              </div>
              <button
                onClick={handleToggleAppLock}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none ${
                  appLockEnabled ? 'bg-[#3C2A3F]' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${
                  appLockEnabled ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Sync & Backup Section */}
        <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-4">
          <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Data Sync & Backup
          </span>

          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3 py-1.5">
              <div className="flex flex-col flex-1">
                <span className="text-xs font-semibold text-[#3C2A3F]">
                  Secure Cloud Synchronization
                </span>
                <span className="text-[9.5px] text-[#3C2A3F]/55 leading-relaxed mt-0.5">
                  Keep data strictly on this device (offline-only) or sync securely to your DINOCYCLE cloud vault in real-time.
                </span>
              </div>
              <button
                onClick={handleToggleCloudSync}
                disabled={isSyncing}
                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 mt-1 ${
                  cloudSyncEnabled ? 'bg-[#3C2A3F]' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all ${
                  cloudSyncEnabled ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>

            {/* If enabled, show sync actions and last sync status */}
            <AnimatePresence>
              {cloudSyncEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-brand-text/5 pt-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#3C2A3F]/50 font-bold uppercase">
                      Vault Status: Active
                    </span>
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="text-[10px] font-bold text-[#3C2A3F] hover:opacity-85 flex items-center gap-1 bg-[#E9E3F5]/60 hover:bg-[#E9E3F5] px-3 py-1.5 rounded-xl transition-all outline-none"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sync statuses */}
            {syncStatus && (
              <div className={`p-3 rounded-2xl text-[10.5px] font-sans border flex items-center gap-1.5 leading-snug ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600'
                  : 'bg-rose-500/10 border-rose-500/15 text-rose-600'
              }`}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                <span>{syncStatus.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* App Options / PWA Installation Section */}
        {!isStandalone && (
          <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-4 animate-fade-in">
            <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D35271]" /> App Options
            </span>

            <div className="space-y-3">
              <p className="text-[10px] text-[#3C2A3F]/60 font-sans leading-relaxed">
                Install DINOCYCLE directly to your device for dynamic home screen access, offline readiness, and faster performance.
              </p>

              <motion.button
                id="pwa-install-btn"
                onClick={handleInstallClick}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D35271] to-[#E97692] hover:opacity-95 text-xs font-sans font-bold text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Download App to Phone</span>
              </motion.button>
            </div>
          </div>
        )}

        {/* Host & Admin Access Portal Section - Only visible to Admin (ishant.optimus@gmail.com) */}
        {isAdminUser && (
          <div className="bg-[#3C2A3F] text-white rounded-[28px] p-5 border border-brand-text/10 space-y-3 shadow-md animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest text-[#F7D9E3] font-bold font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Host & Admin Monitoring
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[8.5px] font-mono font-bold uppercase">
                ADMIN CONFIDENTIAL
              </span>
            </div>

            <p className="text-[10.5px] text-white/70 font-sans leading-relaxed">
              Real-time user monitoring active for <strong className="text-amber-300 font-mono">{user?.email || 'Admin'}</strong>. View live history, logs & visuals across all users.
            </p>

            <button
              onClick={() => {
                if (onOpenAdminMonitor) onOpenAdminMonitor();
              }}
              className="w-full h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer border border-white/10"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Launch Host Admin Portal
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        )}

        {/* Account Management Actions */}
        <div className="bg-white/60 rounded-[28px] p-5 border border-brand-text/5 space-y-3">
          <span className="text-[9px] uppercase tracking-widest text-[#3C2A3F]/50 font-bold font-sans flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Account Security
          </span>

          <div className="flex flex-col gap-2 pt-1">
            {/* Export data button */}
            <button
              onClick={handleExportData}
              className="w-full h-11 px-4 rounded-xl border border-brand-text/5 hover:border-brand-text/15 text-[#3C2A3F] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between active:scale-98 transition-all cursor-pointer bg-white"
            >
              <span className="flex items-center gap-2"><Download className="w-4 h-4 opacity-70" /> Export My Data</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            {/* Log Out button */}
            <button
              onClick={handleLogOut}
              className="w-full h-11 px-4 rounded-xl border border-brand-text/5 hover:border-brand-text/15 text-[#3C2A3F] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between active:scale-98 transition-all cursor-pointer bg-white"
            >
              <span className="flex items-center gap-2"><LogOut className="w-4 h-4 opacity-70 text-amber-600" /> Log Out</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            {/* Delete Account button */}
            <button
              onClick={handleDeleteAccount}
              className="w-full h-11 px-4 rounded-xl border border-rose-500/10 hover:border-rose-500/25 text-rose-600 font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between active:scale-98 transition-all cursor-pointer bg-rose-500/5"
            >
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 opacity-80" /> Delete My Account</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div 
        onClick={handleFooterSecretTap}
        className="h-14 px-6 border-t border-brand-text/5 flex items-center justify-center bg-white/40 backdrop-blur-md shrink-0 cursor-pointer select-none"
      >
        <span className="text-[9px] font-mono font-bold tracking-widest text-[#3C2A3F]/40 uppercase text-center flex items-center gap-1.5 justify-center">
          🌿 DINOCYCLE SECURE VAULT ACTIVE {showAdminSecret ? '(ADMIN UNLOCKED)' : ''}
        </span>
      </div>

    </div>
  );
}

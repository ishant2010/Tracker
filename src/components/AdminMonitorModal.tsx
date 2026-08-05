/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Search, 
  Download, 
  RefreshCw, 
  UserCheck, 
  BarChart3, 
  Terminal, 
  Lock, 
  X, 
  Radio, 
  Eye, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Key, 
  Cpu,
  Send,
  Calendar,
  Filter,
  Users,
  User,
  PieChart,
  TrendingUp,
  Clock
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { roomDb, PeriodLogEntity, SqlConsoleLog } from '../db/roomDb';
import { db, auth } from '../db/firebase';

interface AdminMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onRefreshData?: () => void;
}

export interface FirestoreUserData {
  uid: string;
  email: string;
  displayName: string;
  period_logs: PeriodLogEntity[];
  user_settings: { key: string; value: string }[];
  syncedAt?: string;
  lastActive?: string;
  totalLogsCount?: number;
}

export function AdminMonitorModal({ isOpen, onClose, currentUser, onRefreshData }: AdminMonitorModalProps) {
  const ADMIN_EMAILS = ['ishant.optimus@gmail.com', 'advocatepravin76@gmail.com'];
  const isDirectAdmin = currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase());

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(isDirectAdmin));
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'terminal' | 'broadcast' | 'raw_db'>('overview');

  // Firestore real-time monitoring state
  const [remoteUsers, setRemoteUsers] = useState<FirestoreUserData[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string>('all');

  // Local state & fallback
  const [localLogs, setLocalLogs] = useState<PeriodLogEntity[]>([]);
  const [sqlLogs, setSqlLogs] = useState<SqlConsoleLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymptomFilter, setSelectedSymptomFilter] = useState<string>('all');
  const [adminNotice, setAdminNotice] = useState(() => roomDb.getSetting('admin_broadcast_notice', ''));
  const [noticeSuccessMsg, setNoticeSuccessMsg] = useState('');

  // Auto unlock for admin email
  useEffect(() => {
    if (isDirectAdmin) {
      setIsAuthenticated(true);
    }
  }, [currentUser, isDirectAdmin]);

  // Real-time Firestore Users Listener
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList: FirestoreUserData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        usersList.push({
          uid: docSnap.id,
          email: data.email || 'Anonymous User',
          displayName: data.displayName || 'App User',
          period_logs: data.period_logs || [],
          user_settings: data.user_settings || [],
          syncedAt: data.syncedAt,
          lastActive: data.lastActive,
          totalLogsCount: (data.period_logs || []).length
        });
      });

      // Sort by last active or log count
      usersList.sort((a, b) => (b.totalLogsCount || 0) - (a.totalLogsCount || 0));
      setRemoteUsers(usersList);
    }, (err) => {
      console.warn('Real-time users monitoring stream error:', err);
    });

    return () => unsubscribe();
  }, [isOpen, isAuthenticated]);

  // Load local room DB logs
  const loadAdminData = () => {
    const logs = roomDb.getAllLogs();
    setLocalLogs(logs);

    try {
      const storedSqlLogs = JSON.parse(sessionStorage.getItem('room_sql_logs') || '[]');
      setSqlLogs(storedSqlLogs);
    } catch (e) {
      setSqlLogs([]);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAdminData();
    }
  }, [isOpen, isAuthenticated]);

  // Subscribe to real-time SQL execution updates
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = roomDb.onQueryExecuted((log) => {
      setSqlLogs((prev) => [log, ...prev].slice(0, 50));
      setLocalLogs(roomDb.getAllLogs());
    });
    return unsubscribe;
  }, [isAuthenticated]);

  if (!isOpen) return null;

  const DEFAULT_ADMIN_PIN = roomDb.getSetting('admin_access_pin', '9999');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === DEFAULT_ADMIN_PIN || adminPinInput === '9999' || adminPinInput === 'ADMIN2026') {
      setIsAuthenticated(true);
      setPinError(false);
      setAdminPinInput('');
      loadAdminData();
    } else {
      setPinError(true);
    }
  };

  // Determine active dataset based on selected user filter
  const getActiveLogs = (): { log: PeriodLogEntity; userEmail: string; userUid: string }[] => {
    if (remoteUsers.length > 0) {
      if (selectedUserUid !== 'all') {
        const target = remoteUsers.find(u => u.uid === selectedUserUid);
        if (target) {
          return target.period_logs.map(log => ({
            log,
            userEmail: target.email,
            userUid: target.uid
          }));
        }
      }

      // All users combined
      const combined: { log: PeriodLogEntity; userEmail: string; userUid: string }[] = [];
      remoteUsers.forEach(u => {
        (u.period_logs || []).forEach(log => {
          combined.push({ log, userEmail: u.email, userUid: u.uid });
        });
      });
      return combined.sort((a, b) => b.log.date.localeCompare(a.log.date));
    }

    // Fallback to local logs
    return localLogs.map(log => ({
      log,
      userEmail: currentUser?.email || 'Local Sandbox User',
      userUid: currentUser?.uid || 'LOCAL'
    }));
  };

  const activeUserLogs = getActiveLogs();

  // Filter logs for Admin search
  const filteredLogs = activeUserLogs.filter(({ log, userEmail }) => {
    const matchesSearch = 
      log.date.includes(searchQuery) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.symptoms && log.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (log.mood && log.mood.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSymptom = selectedSymptomFilter === 'all' || 
      (log.symptoms && log.symptoms.includes(selectedSymptomFilter));

    return matchesSearch && matchesSymptom;
  });

  // Calculate visual statistics across monitored user logs
  const symptomCounts: Record<string, number> = {};
  const flowCounts: Record<string, number> = { heavy: 0, medium: 0, light: 0, spotting: 0 };
  const moodCounts: Record<string, number> = {};

  activeUserLogs.forEach(({ log }) => {
    if (log.symptoms) {
      log.symptoms.forEach(sym => {
        symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
      });
    }
    if (log.flow_intensity) {
      flowCounts[log.flow_intensity] = (flowCounts[log.flow_intensity] || 0) + 1;
    }
    if (log.mood) {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    }
  });

  const totalLogsCount = activeUserLogs.length;

  // Handle Export Full Admin Audit Dump JSON
  const handleExportFullDump = () => {
    const fullDumpData = {
      exportTimestamp: new Date().toISOString(),
      adminAuditor: currentUser ? currentUser.email : 'System Admin (ishant.optimus@gmail.com)',
      monitoredUsersCount: remoteUsers.length,
      remoteUsersList: remoteUsers,
      activeLogsDataset: activeUserLogs,
      sqlConsoleHistory: sqlLogs
    };

    const blob = new Blob([JSON.stringify(fullDumpData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DINOCYCLE_HOST_AUDIT_DUMP_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Save Broadcast Notice
  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    roomDb.saveSetting('admin_broadcast_notice', adminNotice);
    setNoticeSuccessMsg('Notice updated! Active app users will see this host update on their dashboard.');
    setTimeout(() => setNoticeSuccessMsg(''), 4000);
    if (onRefreshData) onRefreshData();
  };

  const handleClearNotice = () => {
    setAdminNotice('');
    roomDb.saveSetting('admin_broadcast_notice', '');
    setNoticeSuccessMsg('Notice cleared.');
    setTimeout(() => setNoticeSuccessMsg(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  const selectedUserObj = remoteUsers.find(u => u.uid === selectedUserUid);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-[#F3EFE6] text-[#3C2A3F] w-full max-w-3xl rounded-[32px] border border-brand-text/10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
        >
          {/* Top Bar Header */}
          <div className="px-5 py-4 border-b border-brand-text/10 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#3C2A3F] text-[#FCE6D5] flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-serif italic text-base font-bold text-[#3C2A3F] uppercase tracking-wider">
                    Host Real-Time Data Monitor
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE MONITORING
                  </span>
                </div>
                <p className="text-[10px] text-[#3C2A3F]/60 font-sans">
                  {currentUser?.email ? `Authenticated Admin: ${currentUser.email}` : 'Passphrase Authorized Access'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-brand-text/5 hover:bg-brand-text/10 flex items-center justify-center text-[#3C2A3F]/70 hover:text-[#3C2A3F] transition-all cursor-pointer outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Authentication Screen if not verified */}
          {!isAuthenticated ? (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#3C2A3F] text-white flex items-center justify-center shadow-md">
                <Lock className="w-8 h-8 text-[#F7D9E3]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-serif italic text-xl font-bold text-[#3C2A3F]">
                  Host Administrative Access
                </h3>
                <p className="text-xs text-[#3C2A3F]/65 leading-relaxed">
                  Enter Admin Access PIN to view live user logs, history, and real-time visual metrics.
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    maxLength={10}
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Enter Admin PIN (Default: 9999)"
                    className={`w-full h-12 px-4 rounded-2xl bg-white border ${
                      pinError ? 'border-rose-500 text-rose-600' : 'border-brand-text/15 text-[#3C2A3F]'
                    } text-center font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#3C2A3F]/20 shadow-sm`}
                  />
                  {pinError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">
                      Invalid Admin PIN. Try 9999 or ADMIN2026.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-[#3C2A3F] hover:bg-[#523B56] text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Key className="w-4 h-4 text-[#F7D9E3]" />
                  Verify Access
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Navigation Tabs */}
              <div className="px-5 pt-3 border-b border-brand-text/10 bg-white/40 flex items-center justify-between overflow-x-auto no-scrollbar shrink-0">
                <div className="flex items-center gap-1">
                  {[
                    { id: 'overview', label: 'Visual Overview', icon: <PieChart className="w-3.5 h-3.5" /> },
                    { id: 'users', label: `Users Directory (${remoteUsers.length})`, icon: <Users className="w-3.5 h-3.5" /> },
                    { id: 'logs', label: `User History (${activeUserLogs.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
                    { id: 'terminal', label: 'SQL Terminal', icon: <Terminal className="w-3.5 h-3.5" /> },
                    { id: 'broadcast', label: 'Host Notice', icon: <Radio className="w-3.5 h-3.5" /> },
                    { id: 'raw_db', label: 'Export Audit', icon: <Database className="w-3.5 h-3.5" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-2 rounded-t-2xl font-sans font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border-b-2 ${
                        activeTab === tab.id
                          ? 'bg-white border-[#3C2A3F] text-[#3C2A3F] shadow-sm'
                          : 'text-[#3C2A3F]/60 border-transparent hover:text-[#3C2A3F] hover:bg-white/50'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* User Selector Dropdown */}
                {remoteUsers.length > 0 && (
                  <div className="flex items-center gap-1.5 pb-2 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-[#3C2A3F]/50" />
                    <select
                      value={selectedUserUid}
                      onChange={(e) => setSelectedUserUid(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-white border border-brand-text/15 text-xs font-sans font-bold text-[#3C2A3F] outline-none cursor-pointer"
                    >
                      <option value="all">🌐 All Users ({remoteUsers.length})</option>
                      {remoteUsers.map(u => (
                        <option key={u.uid} value={u.uid}>
                          👤 {u.email || u.displayName} ({u.totalLogsCount || 0} logs)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Main Content Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                
                {/* TAB 1: VISUAL OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Active User Target Banner */}
                    <div className="bg-white rounded-2xl p-4 border border-brand-text/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#3C2A3F] text-[#F7D9E3] flex items-center justify-center font-serif italic text-lg font-bold shrink-0">
                          {selectedUserObj ? selectedUserObj.email.charAt(0).toUpperCase() : 'ALL'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-sans font-bold text-sm text-[#3C2A3F]">
                              {selectedUserObj ? selectedUserObj.email : 'All App Users Monitored Dataset'}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold uppercase">
                              REAL-TIME FIRESTORE
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[#3C2A3F]/60 font-mono">
                            {selectedUserObj ? `UID: ${selectedUserObj.uid} | Last Active: ${selectedUserObj.lastActive || selectedUserObj.syncedAt || 'Just now'}` : `${remoteUsers.length} active registered accounts in cloud vault`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#3C2A3F]">
                        <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span>{totalLogsCount} Total Health Logs</span>
                      </div>
                    </div>

                    {/* Metrics Key Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-white p-3.5 rounded-2xl border border-brand-text/10 shadow-sm space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#3C2A3F]/50 uppercase">Monitored Users</span>
                        <div className="text-xl font-serif italic font-bold text-[#3C2A3F]">
                          {remoteUsers.length || 1}
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Real-time active
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-brand-text/10 shadow-sm space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#3C2A3F]/50 uppercase">Total Logged Days</span>
                        <div className="text-xl font-serif italic font-bold text-[#3C2A3F]">
                          {totalLogsCount}
                        </div>
                        <span className="text-[9px] text-[#3C2A3F]/60">Cycle entries</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-brand-text/10 shadow-sm space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#3C2A3F]/50 uppercase">Heavy Flow Days</span>
                        <div className="text-xl font-serif italic font-bold text-rose-600">
                          {flowCounts.heavy || 0}
                        </div>
                        <span className="text-[9px] text-rose-600/80 font-bold">Flow intensity</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-brand-text/10 shadow-sm space-y-1">
                        <span className="text-[9px] font-mono font-bold text-[#3C2A3F]/50 uppercase">Symptoms Count</span>
                        <div className="text-xl font-serif italic font-bold text-[#3C2A3F]">
                          {Object.values(symptomCounts).reduce((a, b) => a + b, 0)}
                        </div>
                        <span className="text-[9px] text-amber-700 font-bold">Reported issues</span>
                      </div>
                    </div>

                    {/* Visual Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Flow Intensity Visual Chart */}
                      <div className="bg-white p-4 rounded-2xl border border-brand-text/10 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-[#3C2A3F]/50 uppercase tracking-widest flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-rose-500" /> Flow Intensity Distribution
                          </span>
                        </div>

                        <div className="space-y-2 pt-1">
                          {[
                            { key: 'heavy', label: 'Heavy Flow', color: 'bg-rose-500', count: flowCounts.heavy || 0 },
                            { key: 'medium', label: 'Medium Flow', color: 'bg-amber-500', count: flowCounts.medium || 0 },
                            { key: 'light', label: 'Light Flow', color: 'bg-emerald-500', count: flowCounts.light || 0 },
                            { key: 'spotting', label: 'Spotting', color: 'bg-sky-500', count: flowCounts.spotting || 0 },
                          ].map(f => {
                            const pct = totalLogsCount > 0 ? Math.round((f.count / totalLogsCount) * 100) : 0;
                            return (
                              <div key={f.key} className="space-y-1">
                                <div className="flex justify-between text-xs font-sans font-bold text-[#3C2A3F]">
                                  <span>{f.label}</span>
                                  <span className="font-mono">{f.count} days ({pct}%)</span>
                                </div>
                                <div className="h-2 w-full bg-[#F3EFE6] rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${f.color} transition-all duration-500`} 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Symptom Frequency Visual Distribution */}
                      <div className="bg-white p-4 rounded-2xl border border-brand-text/10 shadow-sm space-y-3">
                        <span className="text-[10px] font-mono font-bold text-[#3C2A3F]/50 uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Top Reported Symptoms Visual
                        </span>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {Object.entries(symptomCounts).length === 0 ? (
                            <span className="text-xs text-[#3C2A3F]/50 italic">No symptoms recorded yet.</span>
                          ) : (
                            Object.entries(symptomCounts).map(([symptom, count]) => (
                              <div key={symptom} className="px-3 py-2 rounded-xl bg-[#F3EFE6] border border-brand-text/10 flex items-center gap-2">
                                <span className="text-xs font-bold text-[#3C2A3F] capitalize">{symptom}</span>
                                <span className="px-2 py-0.5 rounded-md bg-[#3C2A3F] text-white text-[10px] font-bold font-mono">
                                  {count}x
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* TAB 2: USERS DIRECTORY */}
                {activeTab === 'users' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-white p-3 rounded-2xl border border-brand-text/10 shadow-sm flex items-center justify-between">
                      <span className="text-xs font-sans font-bold text-[#3C2A3F] flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" /> Active Users Database Directory
                      </span>
                      <span className="text-xs font-mono text-[#3C2A3F]/60 font-semibold">
                        {remoteUsers.length} registered accounts
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {remoteUsers.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-brand-text/5">
                          <p className="text-xs text-[#3C2A3F]/60">No user accounts synced to Firestore yet. Users syncing data will appear here in real time.</p>
                        </div>
                      ) : (
                        remoteUsers.map((u) => (
                          <div 
                            key={u.uid} 
                            onClick={() => {
                              setSelectedUserUid(u.uid);
                              setActiveTab('overview');
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              selectedUserUid === u.uid 
                                ? 'bg-[#3C2A3F] text-white border-[#3C2A3F] shadow-md' 
                                : 'bg-white text-[#3C2A3F] border-brand-text/10 hover:border-brand-text/20 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold font-serif text-base shrink-0 ${
                                selectedUserUid === u.uid ? 'bg-white/10 text-[#F7D9E3]' : 'bg-[#F3EFE6] text-[#3C2A3F]'
                              }`}>
                                <User className="w-5 h-5" />
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-sans font-bold text-xs">{u.email}</h4>
                                  {u.email === currentUser?.email && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[8.5px] font-mono font-bold uppercase">
                                      CURRENT ADMIN
                                    </span>
                                  )}
                                </div>
                                <p className={`font-mono text-[10px] ${selectedUserUid === u.uid ? 'text-white/70' : 'text-[#3C2A3F]/60'}`}>
                                  UID: {u.uid}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs block">{u.totalLogsCount || 0} period logs</span>
                                <span className={`text-[9.5px] font-mono ${selectedUserUid === u.uid ? 'text-white/60' : 'text-[#3C2A3F]/50'}`}>
                                  Synced: {u.syncedAt ? new Date(u.syncedAt).toLocaleDateString() : 'Active'}
                                </span>
                              </div>

                              <button className={`px-3 py-1.5 rounded-xl font-sans font-bold text-xs transition-all ${
                                selectedUserUid === u.uid ? 'bg-white text-[#3C2A3F]' : 'bg-[#3C2A3F] text-white'
                              }`}>
                                Inspect
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: LOGGED RECORDS HISTORY */}
                {activeTab === 'logs' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 bg-white p-2.5 rounded-2xl border border-brand-text/10 shadow-sm">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#3C2A3F]/40 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search user logs by email, date, notes, symptom..."
                          className="w-full pl-9 pr-3 py-1.5 bg-[#F3EFE6]/50 rounded-xl text-xs font-sans text-[#3C2A3F] focus:outline-none border border-transparent focus:border-brand-text/20"
                        />
                      </div>

                      <select
                        value={selectedSymptomFilter}
                        onChange={(e) => setSelectedSymptomFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-[#F3EFE6] border border-brand-text/10 text-xs font-sans font-bold text-[#3C2A3F] outline-none"
                      >
                        <option value="all">All Symptoms Filter</option>
                        {Object.keys(symptomCounts).map(s => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Log Cards List */}
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-2xl border border-brand-text/5">
                          <p className="text-xs text-[#3C2A3F]/50">No logs found matching search criteria.</p>
                        </div>
                      ) : (
                        filteredLogs.map(({ log, userEmail }, idx) => (
                          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-brand-text/10 shadow-sm space-y-2 hover:border-brand-text/20 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-[#D35271]" />
                                <span className="font-mono font-bold text-xs text-[#3C2A3F]">{log.date}</span>
                                {log.flow_intensity && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase font-sans ${
                                    log.flow_intensity === 'heavy' ? 'bg-rose-500/15 text-rose-700' :
                                    log.flow_intensity === 'medium' ? 'bg-amber-500/15 text-amber-700' :
                                    'bg-sky-500/15 text-sky-700'
                                  }`}>
                                    {log.flow_intensity} flow
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E9E3F5] text-[#3C2A3F]">
                                👤 {userEmail}
                              </span>
                            </div>

                            {/* Symptoms tags */}
                            {log.symptoms && log.symptoms.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {log.symptoms.map(s => (
                                  <span key={s} className="px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#3C2A3F] text-[9.5px] font-medium capitalize">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Notes */}
                            {log.notes && (
                              <p className="text-[11px] text-[#3C2A3F]/75 font-sans italic bg-[#F3EFE6]/40 p-2 rounded-xl">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: SQL TERMINAL */}
                {activeTab === 'terminal' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between bg-black text-emerald-400 p-3 rounded-2xl font-mono text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-emerald-400" /> Virtual SQLite Query Execution Log
                      </span>
                      <span className="text-[9px] text-zinc-500">Real-time DB Engine</span>
                    </div>

                    <div className="bg-zinc-950 text-zinc-300 p-4 rounded-2xl font-mono text-[11px] max-h-[350px] overflow-y-auto space-y-2 border border-zinc-800">
                      {sqlLogs.length === 0 ? (
                        <p className="text-zinc-600 italic">No SQL statements executed in this session yet.</p>
                      ) : (
                        sqlLogs.map((log, idx) => (
                          <div key={idx} className="border-b border-zinc-900 pb-1.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[9.5px] text-zinc-500">
                              <span>{log.timestamp}</span>
                              <span className="text-emerald-500 font-bold">{log.status} ({log.rowsAffected} rows)</span>
                            </div>
                            <div className="text-amber-300 break-all">
                              &gt; {log.statement}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: BROADCAST NOTICE TO USER */}
                {activeTab === 'broadcast' && (
                  <div className="space-y-4 animate-fade-in bg-white p-5 rounded-2xl border border-brand-text/10 shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-[#3C2A3F]/50 uppercase tracking-widest flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-rose-500" /> Host Announcement Broadcast System
                      </span>
                      <p className="text-xs text-[#3C2A3F]/70 leading-relaxed">
                        Publish an operational update or admin broadcast message to active app users.
                      </p>
                    </div>

                    <form onSubmit={handleSaveNotice} className="space-y-3">
                      <textarea
                        rows={3}
                        value={adminNotice}
                        onChange={(e) => setAdminNotice(e.target.value)}
                        placeholder="e.g., Host Announcement: Scheduled system update completed. All features are running smoothly."
                        className="w-full p-3 bg-[#F3EFE6] rounded-2xl border border-brand-text/10 text-xs font-sans text-[#3C2A3F] focus:outline-none focus:ring-2 focus:ring-[#3C2A3F]/20"
                      />

                      {noticeSuccessMsg && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{noticeSuccessMsg}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2.5 rounded-xl bg-[#3C2A3F] hover:bg-[#523B56] text-white text-xs font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5 text-[#F7D9E3]" /> Publish Notice
                        </button>

                        <button
                          type="button"
                          onClick={handleClearNotice}
                          className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-sans font-bold transition-all cursor-pointer"
                        >
                          Clear Notice
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 6: SYSTEM EXPORT */}
                {activeTab === 'raw_db' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white p-5 rounded-2xl border border-brand-text/10 shadow-sm space-y-4">
                      <span className="text-[10px] font-mono font-bold text-[#3C2A3F]/50 uppercase tracking-widest flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-600" /> Administrative Export & Audit Dump
                      </span>

                      <div className="p-4 rounded-2xl bg-[#F3EFE6] border border-brand-text/5 space-y-2">
                        <h4 className="font-sans font-bold text-xs text-[#3C2A3F]">
                          Complete Administrative Data Dump (.json)
                        </h4>
                        <p className="text-[11px] text-[#3C2A3F]/70 leading-relaxed">
                          Download a complete structural JSON export containing all user logs, registered email accounts, and database audit history.
                        </p>

                        <button
                          onClick={handleExportFullDump}
                          className="mt-2 h-10 px-4 rounded-xl bg-[#3C2A3F] hover:bg-[#523B56] text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                        >
                          <Download className="w-4 h-4 text-[#F7D9E3]" /> Download Full Audit Dump (.json)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-brand-text/10 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
                <span className="text-[9.5px] font-mono text-[#3C2A3F]/60 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> CONFIDENTIAL HOST MONITORING ACTIVE
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-[#3C2A3F] text-white font-sans font-bold text-xs cursor-pointer hover:bg-[#523B56] transition-all"
                >
                  Close Portal
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

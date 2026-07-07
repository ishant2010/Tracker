/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Terminal, Calendar, Award, RefreshCw, BarChart3, Clock, Trash2, ShieldCheck, Play, Bell, BellRing, Sparkles, Volume2, Palette, Moon, Lock, Fingerprint, Smartphone } from 'lucide-react';
import { roomDb, PeriodLogEntity, SqlConsoleLog } from '../db/roomDb';
import { AestheticEmptyState } from './AestheticEmptyState';

interface TrendsScreenProps {
  stats: ReturnType<typeof roomDb.calculateStats>;
  onDbUpdated: () => void;
  todayStr: string; // YYYY-MM-DD
  onTriggerNotification?: (title: string, body: string, type: 'period' | 'reminder' | 'self_care') => void;
  theme: string;
  onThemeChanged: (newTheme: string) => void;
  onMinimizeApp?: () => void;
}

export function TrendsScreen({ stats, onDbUpdated, todayStr, onTriggerNotification, theme, onThemeChanged, onMinimizeApp }: TrendsScreenProps) {
  const [activeSubTab, setActiveSubTab] = useState<'trends' | 'sqlite' | 'alerts'>('trends');
  const [rawLogs, setRawLogs] = useState<PeriodLogEntity[]>([]);
  const [dbLogs, setDbLogs] = useState<SqlConsoleLog[]>([]);

  // Security Lock states loaded from SQLite UserSettings
  const [securityLockEnabled, setSecurityLockEnabled] = useState(() => {
    return roomDb.getSetting('security_lock_enabled', 'false') === 'true';
  });
  const [securityPin, setSecurityPin] = useState(() => {
    return roomDb.getSetting('security_pin', '1234');
  });
  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    return roomDb.getSetting('biometric_enabled', 'false') === 'true';
  });
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  const handleToggleLock = () => {
    const newValue = !securityLockEnabled;
    setSecurityLockEnabled(newValue);
    roomDb.saveSetting('security_lock_enabled', String(newValue));
    playSubtleBeep();
    onDbUpdated();
  };

  const handleToggleBiometric = () => {
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    roomDb.saveSetting('biometric_enabled', String(newValue));
    playSubtleBeep();
    onDbUpdated();
  };

  const handleSavePin = () => {
    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      alert('PIN must be exactly 4 digits.');
      return;
    }
    roomDb.saveSetting('security_pin', newPinInput);
    setSecurityPin(newPinInput);
    setNewPinInput('');
    setShowPinChange(false);
    playSubtleBeep();
    onDbUpdated();
  };

  // Notification states loaded from SQLite UserSettings
  const [periodAlertEnabled, setPeriodAlertEnabled] = useState(() => {
    return roomDb.getSetting('notification_period_enabled', 'true') === 'true';
  });
  const [periodDaysBefore, setPeriodDaysBefore] = useState(() => {
    return Number(roomDb.getSetting('notification_period_days_before', '1'));
  });
  const [cycleAlertEnabled, setCycleAlertEnabled] = useState(() => {
    return roomDb.getSetting('notification_cycle_enabled', 'true') === 'true';
  });
  const [cycleTime, setCycleTime] = useState(() => {
    return roomDb.getSetting('notification_cycle_time', '20:00');
  });
  const [selfCareEnabled, setSelfCareEnabled] = useState(() => {
    return roomDb.getSetting('notification_self_care_enabled', 'true') === 'true';
  });

  // State handlers to update sqlite user_settings instantly
  const handleToggleSetting = (key: string, currentValue: boolean, setter: (val: boolean) => void) => {
    const newValue = !currentValue;
    setter(newValue);
    roomDb.saveSetting(key, String(newValue));
    onDbUpdated();
  };

  const handleSelectSetting = (key: string, value: string, setter: (val: any) => void) => {
    setter(value);
    roomDb.saveSetting(key, value);
    onDbUpdated();
  };

  // Play custom premium sound effect for local alerts sandbox preview
  const playSubtleBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      oscillator.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
      
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio context might be blocked by browser policy until interaction
    }
  };

  // Refresh lists
  const refreshLocalData = () => {
    setRawLogs(roomDb.getAllLogs());
    setDbLogs(roomDb.getSqlConsoleLogs());
  };

  useEffect(() => {
    refreshLocalData();
    // Register listener for database operations to update virtual SQL console immediately
    const unsubscribe = roomDb.onQueryExecuted(() => {
      setDbLogs(roomDb.getSqlConsoleLogs());
    });
    return () => {
      unsubscribe();
    };
  }, [stats]);

  // Handle wiping data
  const handleRestoreDefaults = () => {
    if (confirm('Are you sure you want to restore the default historical demo data? This will overwrite current entries.')) {
      roomDb.clearDatabase();
      onDbUpdated();
      refreshLocalData();
    }
  };

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to completely wipe all database logs? The tracker will fallback to default calculations (28-day cycle, 5-day period).')) {
      roomDb.makeDatabaseCompletelyEmpty();
      onDbUpdated();
      refreshLocalData();
    }
  };

  // Compute symptom frequency stats
  const symptomStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalLogsWithSymptoms = 0;

    rawLogs.forEach(log => {
      if (log.symptoms && log.symptoms.length > 0) {
        totalLogsWithSymptoms++;
        log.symptoms.forEach(sym => {
          counts[sym] = (counts[sym] || 0) + 1;
        });
      }
    });

    const friendlyNames: Record<string, string> = {
      cramps: 'Cramps ⚡',
      headache: 'Headache 🧠',
      bloating: 'Bloating 🎈',
      acne: 'Acne ✨',
      fatigue: 'Fatigue 💤',
      mood_swings: 'Mood Swings 🎭',
      backache: 'Backache 🩹',
      cravings: 'Cravings 🍫'
    };

    const list = Object.keys(counts).map(key => ({
      id: key,
      label: friendlyNames[key] || key,
      count: counts[key],
      percentage: totalLogsWithSymptoms > 0 ? Math.round((counts[key] / totalLogsWithSymptoms) * 100) : 0
    }));

    return list.sort((a, b) => b.count - a.count);
  }, [rawLogs]);

  // Compute mood frequency stats
  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalLogsWithMoods = 0;

    rawLogs.forEach(log => {
      if (log.mood) {
        totalLogsWithMoods++;
        counts[log.mood] = (counts[log.mood] || 0) + 1;
      }
    });

    const friendlyNames: Record<string, string> = {
      happy: 'Happy 😊',
      sensitive: 'Moody 😭',
      tired: 'Tired 😴',
      anxious: 'Anxious 😟',
      calm: 'Calm 🧘‍♀️'
    };

    return Object.keys(counts).map(key => ({
      id: key,
      label: friendlyNames[key] || key,
      count: counts[key],
      percentage: totalLogsWithMoods > 0 ? Math.round((counts[key] / totalLogsWithMoods) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, [rawLogs]);

  // Compute cycle length trendline coordinates
  const cycleHistory = useMemo(() => {
    const groups = stats.periodGroups;
    const history: { label: string; days: number; isPrediction?: boolean }[] = [];
    
    // Simple helper to parse "YYYY-MM-DD" safely
    const parseSimpleDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    if (groups.length >= 2) {
      for (let i = 1; i < groups.length; i++) {
        const startPrev = parseSimpleDate(groups[i - 1].startDate);
        const startCurr = parseSimpleDate(groups[i].startDate);
        const diffTime = startCurr.getTime() - startPrev.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const monthLabel = startCurr.toLocaleDateString('en-US', { month: 'short' });
        history.push({
          label: monthLabel,
          days: diffDays,
          isPrediction: false
        });
      }
    } else if (groups.length === 1) {
      const defaultLen = Number(roomDb.getSetting('default_cycle_length', '28'));
      const start = parseSimpleDate(groups[0].startDate);
      
      const prevMonth = new Date(start);
      prevMonth.setDate(prevMonth.getDate() - defaultLen);
      
      history.push({
        label: prevMonth.toLocaleDateString('en-US', { month: 'short' }),
        days: defaultLen,
        isPrediction: true
      });
      history.push({
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        days: defaultLen,
        isPrediction: false
      });
    } else {
      const defaultLen = Number(roomDb.getSetting('default_cycle_length', '28'));
      history.push({ label: 'Baseline', days: defaultLen, isPrediction: true });
      history.push({ label: 'Current', days: defaultLen, isPrediction: false });
    }
    return history;
  }, [stats.periodGroups]);

  // Dynamic anomaly detector for logged cycles
  const cycleAnomalies = useMemo(() => {
    // Look at completed actual logged cycles
    const actualLoggedCycles = cycleHistory.filter(c => !c.isPrediction && c.label !== 'Baseline' && c.label !== 'Current');
    const list: { type: 'short' | 'long'; days: number; message: string; dateLabel: string }[] = [];

    actualLoggedCycles.forEach(cycle => {
      if (cycle.days < 21) {
        list.push({
          type: 'short',
          days: cycle.days,
          dateLabel: cycle.label,
          message: `Your cycle was shorter than typical (${cycle.days} days) in ${cycle.label}. Slight cycle variations are perfectly natural. Let's continue monitoring your flow, and check in with your physician if you notice persistent rapid starts. Stay warm! 🌸`
        });
      } else if (cycle.days > 35) {
        list.push({
          type: 'long',
          days: cycle.days,
          dateLabel: cycle.label,
          message: `Your cycle was a bit longer (${cycle.days} days) in ${cycle.label}. Stress, hormonal pivots, or traveling can cause mild shifts. Wrap yourself in cozy blankets, sip warm herbal tea, and allow your body some calm days. 🧘‍♀️`
        });
      }
    });
    return list;
  }, [cycleHistory]);

  const weeklySleepData = useMemo(() => {
    const result = [];
    const [y, m, dVal] = todayStr.split('-').map(Number);
    const baseDate = new Date(y, m - 1, dVal);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const log = rawLogs.find(l => l.date === dateString);
      
      const weekdayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      
      const sleep = log && log.sleep_duration !== undefined ? log.sleep_duration : 8.0;
      
      result.push({
        date: dateString,
        label: `${weekdayAbbr} ${dayNum}`,
        sleep,
        flow: log?.flow_intensity || null,
        mood: log?.mood || null,
        symptomsCount: log?.symptoms?.length || 0,
        isLogged: !!log
      });
    }
    return result;
  }, [rawLogs, todayStr]);

  const sleepCorrelationStats = useMemo(() => {
    let totalSleep = 0;
    let loggedDaysCount = 0;
    let flowDaysSleep = 0;
    let flowDaysCount = 0;
    let nonFlowDaysSleep = 0;
    let nonFlowDaysCount = 0;

    weeklySleepData.forEach(d => {
      totalSleep += d.sleep;
      if (d.isLogged) {
        loggedDaysCount++;
        if (d.flow) {
          flowDaysSleep += d.sleep;
          flowDaysCount++;
        } else {
          nonFlowDaysSleep += d.sleep;
          nonFlowDaysCount++;
        }
      }
    });

    const overallAvg = weeklySleepData.length > 0 ? (totalSleep / weeklySleepData.length).toFixed(1) : '8.0';
    const flowAvg = flowDaysCount > 0 ? (flowDaysSleep / flowDaysCount).toFixed(1) : null;
    const nonFlowAvg = nonFlowDaysCount > 0 ? (nonFlowDaysSleep / nonFlowDaysCount).toFixed(1) : null;

    return {
      overallAvg,
      flowAvg,
      nonFlowAvg,
      hasFlowData: flowDaysCount > 0,
    };
  }, [weeklySleepData]);

  // Generates a local text summary report of the past 6 months of period dates and average symptoms/medications
  const handleExportReport = () => {
    const logs = roomDb.getAllLogs();
    const { averageCycleLength, averagePeriodLength } = stats;

    let report = `==================================================\n`;
    report += `       SISTERHOOD SANCTUARY - HEALTH REPORT       \n`;
    report += `==================================================\n`;
    report += `Generated On : ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}\n`;
    report += `Average Cycle Duration : ${averageCycleLength} days\n`;
    report += `Average Period Duration: ${averagePeriodLength} days\n\n`;

    report += `--------------------------------------------------\n`;
    report += `     CYCLE HISTORY LOGS (Last 6 Months)           \n`;
    report += `--------------------------------------------------\n`;

    if (logs.length === 0) {
      report += `No entries logged yet in the local database.\n`;
    } else {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

      const filteredLogs = logs.filter(l => {
        const [ly, lm, ld] = l.date.split('-').map(Number);
        const dateObj = new Date(ly, lm - 1, ld);
        return dateObj >= sixMonthsAgo;
      });

      if (filteredLogs.length === 0) {
        report += `No logged entries found in the last 6 months.\n`;
      } else {
        filteredLogs.forEach(log => {
          const [ly, lm, ld] = log.date.split('-').map(Number);
          const logDateObj = new Date(ly, lm - 1, ld);
          const dateFormatted = logDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          const flow = log.flow_intensity ? log.flow_intensity.toUpperCase() : 'NONE';
          const symptomsList = log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : 'None';
          const moodText = log.mood ? log.mood : 'None';
          const medicationsList = log.medications && log.medications.length > 0 ? log.medications.join(', ') : 'None';

          report += `Date: ${dateFormatted}\n`;
          report += `  - Flow Intensity : ${flow}\n`;
          report += `  - Symptoms       : ${symptomsList}\n`;
          report += `  - Primary Mood   : ${moodText}\n`;
          report += `  - Sleep Duration : ${log.sleep_duration !== undefined ? log.sleep_duration + ' hrs' : 'Not Logged'}\n`;
          report += `  - Medication Log : ${medicationsList}\n`;
          if (log.notes) {
            report += `  - Daily Notes    : "${log.notes}"\n`;
          }
          report += `\n`;
        });
      }
    }

    report += `--------------------------------------------------\n`;
    report += `Disclaimer: This report was securely compiled\n`;
    report += `offline using local device Room/SQLite storage.\n`;
    report += `No cloud databases ever saw this metadata.\n`;
    report += `==================================================\n`;

    // Trigger download of text file
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sisterhood_Sanctuary_Health_Report.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playSubtleBeep();
  };

  // Helper to render the custom cycle trend line chart using crisp SVGs
  const renderCycleTrendChart = () => {
    const width = 320;
    const height = 150;
    const paddingLeft = 40;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 30;

    const data = cycleHistory;

    // Map Y coordinates to scale beautifully
    const minVal = Math.max(0, Math.min(21, ...data.map(d => d.days)) - 2);
    const maxVal = Math.max(35, ...data.map(d => d.days)) + 2;
    const range = maxVal - minVal || 1;

    const getY = (val: number) => {
      return height - paddingBottom - ((val - minVal) / range) * (height - paddingTop - paddingBottom);
    };

    const getX = (idx: number) => {
      if (data.length <= 1) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
      return paddingLeft + (idx * (width - paddingLeft - paddingRight)) / (data.length - 1);
    };

    const pathD = data.length > 0 ? `M ${data.map((d, i) => `${getX(i)} ${getY(d.days)}`).join(' L ')}` : '';
    
    let areaD = '';
    if (data.length >= 2) {
      const startX = getX(0);
      const endX = getX(data.length - 1);
      areaD = `${pathD} L ${endX} ${height - paddingBottom} L ${startX} ${height - paddingBottom} Z`;
    }

    const gridLines = [21, 28, 35];

    return (
      <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#3C2A3F]/60">
            Cycle Length Trend (Months)
          </span>
          <span className="text-[9px] font-mono text-[#3C2A3F]/50 font-bold">
            Average: {stats.averageCycleLength} days
          </span>
        </div>

        <div className="relative w-full h-[150px]">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-pink)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--brand-peach)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid horizontal markers */}
            {gridLines.map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke="var(--brand-text)" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                    opacity="0.08" 
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 3} 
                    textAnchor="end" 
                    fill="var(--brand-text)" 
                    opacity="0.4" 
                    className="font-mono text-[9px] font-bold"
                  >
                    {val}d
                  </text>
                </g>
              );
            })}

            {/* Area path */}
            {areaD && (
              <path d={areaD} fill="url(#chart-grad)" />
            )}

            {/* Line connector */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="var(--brand-peach)" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}

            {/* Coordinates */}
            {data.map((d, i) => {
              const x = getX(i);
              const y = getY(d.days);
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="var(--brand-bg)" stroke="var(--brand-peach)" strokeWidth="2" />
                  <circle cx={x} cy={y} r="1.5" fill="var(--brand-peach)" />
                  <text 
                    x={x} 
                    y={y - 10} 
                    textAnchor="middle" 
                    fill="var(--brand-text)" 
                    className="font-mono text-[9px] font-bold"
                  >
                    {d.days}d
                  </text>
                  <text 
                    x={x} 
                    y={height - 8} 
                    textAnchor="middle" 
                    fill="var(--brand-text)" 
                    opacity="0.6" 
                    className="font-sans text-[9px] font-bold"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Helper to render the sleep duration and cycle flow correlation chart
  const renderSleepCorrelationChart = () => {
    const width = 320;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;

    const data = weeklySleepData;

    // Sleep hours are scaled between 4 and 12
    const minVal = 4;
    const maxVal = 12;
    const range = maxVal - minVal;

    const getY = (val: number) => {
      return height - paddingBottom - ((val - minVal) / range) * (height - paddingTop - paddingBottom);
    };

    const getX = (idx: number) => {
      if (data.length <= 1) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
      return paddingLeft + (idx * (width - paddingLeft - paddingRight)) / (data.length - 1);
    };

    const pathD = data.length > 0 ? `M ${data.map((d, i) => `${getX(i)} ${getY(d.sleep)}`).join(' L ')}` : '';
    
    let areaD = '';
    if (data.length >= 2) {
      const startX = getX(0);
      const endX = getX(data.length - 1);
      areaD = `${pathD} L ${endX} ${height - paddingBottom} L ${startX} ${height - paddingBottom} Z`;
    }

    const gridLines = [4, 6, 8, 10, 12];

    const getFlowBgColor = (flow: string | null) => {
      if (!flow) return 'transparent';
      if (flow === 'heavy') return 'var(--brand-text)';
      if (flow === 'medium') return 'var(--brand-lavender)';
      if (flow === 'light') return 'var(--brand-pink)';
      if (flow === 'spotting') return 'var(--brand-peach)';
      return 'transparent';
    };

    const getFlowOpacity = (flow: string | null) => {
      if (!flow) return 0;
      if (flow === 'heavy') return 0.25;
      if (flow === 'medium') return 0.6;
      if (flow === 'light') return 0.7;
      if (flow === 'spotting') return 0.7;
      return 0;
    };

    return (
      <div className="bg-brand-bg/85 border border-brand-text/10 rounded-[28px] p-4.5 shadow-sm overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-brand-text/60">
            Weekly Sleep & Cycle Correlation
          </span>
          <span className="text-[9px] font-mono text-brand-text/50 font-bold">
            Avg Sleep: {sleepCorrelationStats.overallAvg}h
          </span>
        </div>

        <div className="relative w-full h-[180px]">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="sleep-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-lavender)" stopOpacity="0.75" />
                <stop offset="100%" stopColor="var(--brand-pink)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid horizontal markers */}
            {gridLines.map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke="var(--brand-text)" 
                    strokeWidth="1" 
                    strokeDasharray="3 3" 
                    opacity="0.07" 
                  />
                  <text 
                    x={paddingLeft - 6} 
                    y={y + 3} 
                    textAnchor="end" 
                    fill="var(--brand-text)" 
                    opacity="0.4" 
                    className="font-mono text-[8px] font-bold"
                  >
                    {val}h
                  </text>
                </g>
              );
            })}

            {/* Correlation Background Pillars for Flow */}
            {data.map((d, i) => {
              const x = getX(i);
              const colWidth = ((width - paddingLeft - paddingRight) / (data.length - 1)) * 0.45;
              const hasFlow = !!d.flow;
              
              return (
                <g key={`pillar-${i}`} opacity="0.8">
                  {hasFlow && (
                    <rect
                      x={x - colWidth / 2}
                      y={getY(12)}
                      width={colWidth}
                      height={getY(4) - getY(12)}
                      fill={getFlowBgColor(d.flow)}
                      opacity={getFlowOpacity(d.flow)}
                      rx="3"
                      className="transition-all duration-300"
                    />
                  )}
                  {/* Subtle vertical line for alignment */}
                  <line
                    x1={x}
                    y1={getY(12)}
                    x2={x}
                    y2={height - paddingBottom}
                    stroke="var(--brand-text)"
                    strokeWidth="0.5"
                    strokeDasharray="1 3"
                    opacity="0.15"
                  />
                </g>
              );
            })}

            {/* Area path for sleep duration */}
            {areaD && (
              <path d={areaD} fill="url(#sleep-chart-grad)" className="transition-all duration-500" />
            )}

            {/* Line connector */}
            {pathD && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="var(--brand-text)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-500"
              />
            )}

            {/* Coordinates / Mood Icons & Sleep labels */}
            {data.map((d, i) => {
              const x = getX(i);
              const y = getY(d.sleep);
              
              const getMoodEmoji = (mood: string | null) => {
                if (!mood) return '';
                if (mood === 'happy') return '😊';
                if (mood === 'sensitive') return '🥺';
                if (mood === 'tired') return '🥱';
                if (mood === 'anxious') return '😟';
                if (mood === 'calm') return '🧘';
                return '';
              };

              return (
                <g key={`coord-${i}`}>
                  {/* Circle on line */}
                  <circle cx={x} cy={y} r="4" fill="var(--brand-bg)" stroke="var(--brand-text)" strokeWidth="1.5" />
                  <circle cx={x} cy={y} r="1.5" fill="var(--brand-text)" />
                  
                  {/* Sleep Hour Text */}
                  <text 
                    x={x} 
                    y={y - 8} 
                    textAnchor="middle" 
                    fill="var(--brand-text)" 
                    className="font-mono text-[8px] font-extrabold"
                  >
                    {d.sleep}h
                  </text>

                  {/* Mood/Flow Indicators at node or just above */}
                  {d.mood && (
                    <text
                      x={x}
                      y={y + 11}
                      textAnchor="middle"
                      className="text-[9px] select-none"
                    >
                      {getMoodEmoji(d.mood)}
                    </text>
                  )}

                  {/* X Axis Labels (Weekday) */}
                  <text 
                    x={x} 
                    y={height - 24} 
                    textAnchor="middle" 
                    fill="var(--brand-text)" 
                    opacity="0.75" 
                    className="font-sans text-[8px] font-extrabold"
                  >
                    {d.label.split(' ')[0]}
                  </text>
                  <text 
                    x={x} 
                    y={height - 14} 
                    textAnchor="middle" 
                    fill="var(--brand-text)" 
                    opacity="0.4" 
                    className="font-mono text-[8px] font-bold"
                  >
                    {d.label.split(' ')[1]}
                  </text>

                  {/* Flow label on bottom if present */}
                  {d.flow && (
                    <circle 
                      cx={x} 
                      cy={height - 6} 
                      r="2" 
                      fill="var(--brand-text)" 
                      opacity="0.7" 
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-3.5 pt-3 border-t border-brand-text/5 flex flex-wrap justify-between items-center gap-1.5 text-[9px] font-sans font-bold text-brand-text/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-1.5 rounded-sm bg-brand-text" />
              <span>Sleep Path</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-brand-pink/60 border border-brand-text/5" />
              <span>Cycle Day Flow</span>
            </div>
          </div>
          <div className="font-mono text-[8px] text-brand-text/40">
            Pillars represent flow days
          </div>
        </div>

        {/* Insight Box */}
        <div className="mt-3 bg-brand-lavender/40 border border-brand-text/5 rounded-2xl p-2.5 text-[10px] text-brand-text/80 leading-relaxed font-sans">
          <strong>Weekly Sleep Insight:</strong> {
            sleepCorrelationStats.hasFlowData 
              ? `Your average sleep this week is ${sleepCorrelationStats.overallAvg}h. During flow days, you average ${sleepCorrelationStats.flowAvg}h compared to ${sleepCorrelationStats.nonFlowAvg || '8.0'}h on non-flow days. Priority rest is key!`
              : `Your average sleep this week is ${sleepCorrelationStats.overallAvg}h. Logging sleep during periods will reveal dynamic cycle correlation insights.`
          }
        </div>
      </div>
    );
  };

  // Compute average metrics to display
  const nextExpectedDateFormatted = useMemo(() => {
    if (!stats.nextPredictedDate) return 'No prediction yet';
    const [y, m, d] = stats.nextPredictedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [stats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex-1 flex flex-col overflow-y-auto px-6 py-5 space-y-5"
    >
      
      {/* Title block */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#3C2A3F]/60 font-bold font-sans">
            ANALYTICS & VAULT
          </span>
          <h2 className="font-serif italic text-3xl text-[#3C2A3F] font-semibold mt-0.5">
            Trends & Logs
          </h2>
        </div>
        
        {/* Toggle between Trends Charts, SQLite Inspector, and Alerts Settings */}
        <div className="flex bg-[#E9E3F5] p-1 rounded-full text-[10px] font-sans font-bold border border-[#3C2A3F]/5">
          <button
            id="subtab-trends"
            onClick={() => setActiveSubTab('trends')}
            className={`px-2.5 py-1 rounded-full transition-all ${
              activeSubTab === 'trends'
                ? 'bg-white text-[#3C2A3F] shadow-sm'
                : 'text-[#3C2A3F]/60 hover:text-[#3C2A3F]'
            }`}
          >
            Insights
          </button>
          <button
            id="subtab-alerts"
            onClick={() => setActiveSubTab('alerts')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
              activeSubTab === 'alerts'
                ? 'bg-white text-[#3C2A3F] shadow-sm'
                : 'text-[#3C2A3F]/60 hover:text-[#3C2A3F]'
            }`}
          >
            <Bell className="w-2.5 h-2.5" />
            Alerts
          </button>
          <button
            id="subtab-sqlite"
            onClick={() => setActiveSubTab('sqlite')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
              activeSubTab === 'sqlite'
                ? 'bg-[#3C2A3F] text-white shadow-sm'
                : 'text-[#3C2A3F]/60 hover:text-[#3C2A3F]'
            }`}
          >
            <Database className="w-2.5 h-2.5" />
            SQLite
          </button>
        </div>
      </div>

      {activeSubTab === 'trends' ? (
        // TRENDS AND INSIGHTS VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Smart Health Alerts / Cycle length anomalies: Full-width spanning on desktop */}
          {cycleAnomalies.length > 0 && (
            <div className="col-span-1 md:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.1 }}
                className="space-y-2.5"
              >
                {cycleAnomalies.map((anomaly, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#FCE6D5]/75 border border-[#3C2A3F]/10 rounded-[28px] p-4 flex gap-3 items-start shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#3C2A3F] text-white flex items-center justify-center shrink-0">
                      <span className="text-xs">🌸</span>
                    </div>
                    <div>
                      <h4 className="font-serif italic text-xs font-bold text-[#3C2A3F]">
                        Cycle Warning: {anomaly.dateLabel} ({anomaly.days} Days)
                      </h4>
                      <p className="text-[10px] text-[#3C2A3F]/80 font-sans mt-0.5 leading-relaxed">
                        {anomaly.message}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Left Column: Metrics, Predictions, Cycle Insights Graph, and Period History */}
          <div className="space-y-5">
            {/* Dynamic calculations metric grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Average Cycle Duration card */}
              <div className="bg-[#E9E3F5] border border-[#3C2A3F]/5 rounded-[32px] p-4.5 shadow-sm flex flex-col justify-between h-30 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[#3C2A3F]/5 text-3xl select-none">🔂</div>
                <div>
                  <Clock className="w-4 h-4 text-[#3C2A3F] mb-1.5" />
                  <span className="text-[10px] text-[#3C2A3F]/60 font-sans font-bold block uppercase tracking-wider">
                    Cycle Length
                  </span>
                  <span className="font-serif text-2xl text-[#3C2A3F] font-semibold block mt-0.5">
                    {stats.averageCycleLength} days
                  </span>
                </div>
                <span className="text-[9px] text-[#3C2A3F]/75 font-sans font-bold mt-2 block">
                  {stats.isCustom ? '🔄 Dynamic from logs' : '📋 Default setting'}
                </span>
              </div>

              {/* Average Flow Length card */}
              <div className="bg-[#FCE6D5] border border-[#3C2A3F]/5 rounded-[32px] p-4.5 shadow-sm flex flex-col justify-between h-30 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[#3C2A3F]/5 text-3xl select-none">💧</div>
                <div>
                  <BarChart3 className="w-4 h-4 text-[#3C2A3F] mb-1.5" />
                  <span className="text-[10px] text-[#3C2A3F]/60 font-sans font-bold block uppercase tracking-wider">
                    Period Length
                  </span>
                  <span className="font-serif text-2xl text-[#3C2A3F] font-semibold block mt-0.5">
                    {stats.averagePeriodLength} days
                  </span>
                </div>
                <span className="text-[9px] text-[#3C2A3F]/75 font-sans font-bold mt-2 block">
                  {stats.isCustom ? '🔄 Computed dynamically' : '📋 Default setting'}
                </span>
              </div>
            </div>

            {/* Predicted start bar */}
            <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[24px] p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F7D9E3] flex items-center justify-center text-[#3C2A3F] shrink-0">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-sans font-bold tracking-wider text-[#3C2A3F]/50">
                    PREDICTED START DATE
                  </span>
                  <h4 className="font-serif italic text-sm font-bold text-[#3C2A3F] mt-0.5">
                    {nextExpectedDateFormatted}
                  </h4>
                </div>
              </div>
              {stats.nextPredictedDate && (
                <span className="text-[10px] font-sans font-bold text-[#3C2A3F] bg-[#F7D9E3] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Soon!
                </span>
              )}
            </div>

            {/* Custom SVG Cycle Length Trendline Graph */}
            <div className="space-y-2.5">
              <h3 className="font-serif italic text-lg font-bold text-[#3C2A3F] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#3C2A3F]/60" />
                Cycle Length Insights
              </h3>
              {stats.periodGroups.length === 0 ? (
                <AestheticEmptyState 
                  type="calendar"
                  title="We're gathering your cycle trends!"
                  description="Log a few more days of your cycle to unlock detailed, scientific trends and diagnostics."
                />
              ) : (
                renderCycleTrendChart()
              )}
            </div>

            {/* Past Period Group Timeline */}
            <div className="space-y-2.5">
              <h3 className="font-serif italic text-lg font-bold text-[#3C2A3F] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3C2A3F]/60" />
                Your Period History
              </h3>
              
              {stats.periodGroups.length === 0 ? (
                <AestheticEmptyState 
                  type="calendar"
                  title="Your period history is resting"
                  description="Log your start date and flow levels to begin tracking your milestones on this timeline."
                />
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {[...stats.periodGroups].reverse().map((g, idx) => {
                    const formatPrettyDate = (dStr: string) => {
                      const [y, m, d] = dStr.split('-').map(Number);
                      const obj = new Date(y, m - 1, d);
                      return obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };

                    return (
                      <div 
                        key={idx}
                        className="bg-[#FDF9F3]/70 border border-[#3C2A3F]/10 rounded-[24px] p-3.5 flex items-center justify-between hover:border-[#3C2A3F]/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E9E3F5] flex items-center justify-center text-[#3C2A3F]">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-serif italic text-xs font-bold text-[#3C2A3F]">
                              {formatPrettyDate(g.startDate)} – {formatPrettyDate(g.endDate)}
                            </h5>
                            <p className="text-[10px] text-[#3C2A3F]/60 font-sans mt-0.5">
                              Started on a {(() => {
                                const [sy, sm, sd] = g.startDate.split('-').map(Number);
                                const startDayObj = new Date(sy, sm - 1, sd);
                                return startDayObj.toLocaleDateString('en-US', { weekday: 'long' });
                              })()}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-sans font-bold text-[#3C2A3F] bg-[#F7D9E3] px-3 py-1 rounded-full border border-[#3C2A3F]/5">
                          {g.duration} Days Flow
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sleep Correlation, Symptoms, Moods, and Export Center */}
          <div className="space-y-5">
            {/* Custom SVG Weekly Sleep Correlation Graph */}
            <div className="space-y-2.5">
              <h3 className="font-serif italic text-lg font-bold text-brand-text flex items-center gap-2 transition-colors duration-300">
                <Moon className="w-4 h-4 text-brand-text/60" />
                Sleep & Cycle Correlation
              </h3>
              {stats.periodGroups.length === 0 ? (
                <AestheticEmptyState 
                  type="moon"
                  title="Analyzing sleep parameters..."
                  description="Once you log flow intensity and sleep hours, we'll map how your biological phases impact rest quality."
                />
              ) : (
                renderSleepCorrelationChart()
              )}
            </div>

            {/* Symptoms Prevalence Bar Chart */}
            <div className="space-y-2.5">
              <h3 className="font-serif italic text-lg font-bold text-[#3C2A3F] flex items-center gap-2">
                <span className="text-sm">🩹</span>
                Symptom Prevalence
              </h3>

              {symptomStats.length === 0 ? (
                <AestheticEmptyState 
                  type="calendar"
                  title="Waiting for logged symptoms"
                  description="We'll aggregate physical sensations as you record them in your daily sanctuary logs."
                />
              ) : (
                <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 space-y-3.5 shadow-sm">
                  {symptomStats.slice(0, 5).map((sym) => (
                    <div key={sym.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-sans font-semibold text-[#3C2A3F]/80">{sym.label}</span>
                        <span className="font-mono text-[#3C2A3F]/60 text-[10px]">{sym.count}x ({sym.percentage}%)</span>
                      </div>
                      {/* Progress Track */}
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#3C2A3F]/5">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#FCE6D5] to-[#E9E3F5] transition-all duration-500"
                          style={{ width: `${sym.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mood Prevalence Bar Chart */}
            <div className="space-y-2.5">
              <h3 className="font-serif italic text-lg font-bold text-[#3C2A3F] flex items-center gap-2">
                <span className="text-sm">🎭</span>
                Mood Distribution
              </h3>

              {moodStats.length === 0 ? (
                <AestheticEmptyState 
                  type="moon"
                  title="Awaiting emotional insights"
                  description="Mood frequency distributions display emotional patterns across cycle phases."
                />
              ) : (
                <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 space-y-3.5 shadow-sm">
                  {moodStats.slice(0, 5).map((mood) => (
                    <div key={mood.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-sans font-semibold text-[#3C2A3F]/80">{mood.label}</span>
                        <span className="font-mono text-[#3C2A3F]/60 text-[10px]">{mood.count}x ({mood.percentage}%)</span>
                      </div>
                      {/* Progress Track */}
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#3C2A3F]/5">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#FCE6D5] to-[#E9E3F5] transition-all duration-500"
                          style={{ width: `${mood.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor Export Section */}
            <div className="bg-[#FDF9F3]/95 border border-[#3C2A3F]/10 rounded-[32px] p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E9E3F5] text-[#3C2A3F] shrink-0">
                  <span className="text-sm">🩺</span>
                </div>
                <div>
                  <h3 className="font-serif italic text-base font-bold text-[#3C2A3F]">Doctor Sharing Center</h3>
                  <p className="text-[10px] text-[#3C2A3F]/60 font-sans font-semibold">Generate structured reports for sharing</p>
                </div>
              </div>

              <p className="text-[10.5px] text-[#3C2A3F]/75 font-sans leading-relaxed">
                Compile your average symptoms, medication status, logs, and period patterns from the past 6 months into a beautifully formatted text file.
              </p>

              <motion.button
                id="export-report-btn"
                onClick={handleExportReport}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className="w-full py-4 rounded-full bg-[#3C2A3F] hover:bg-[#523B56] text-xs font-sans font-bold text-white shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer min-h-[48px] touch-manipulation"
              >
                <span>Export Report for Doctor</span>
                <span className="text-xs">📋</span>
              </motion.button>
            </div>
          </div>

        </div>
      ) : activeSubTab === 'sqlite' ? (
        // SQLite INSPECTOR & PRIVACY VAULT VIEW
        <div className="space-y-5">
          
          {/* Virtual DB Meta Info */}
          <div className="bg-[#2B1D2F] text-[#FDF9F3] border border-[#3C2A3F]/40 rounded-[32px] p-5 shadow-inner">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-[#FCE6D5]" />
                <span className="text-[10px] uppercase tracking-wider font-bold font-sans text-[#FCE6D5]">
                  SQLite Sandbox Active
                </span>
              </div>
              <span className="text-[9px] bg-[#FCE6D5]/10 text-[#FCE6D5] px-2 py-0.5 rounded border border-[#FCE6D5]/25 font-sans font-bold">
                100% PRIVATE
              </span>
            </div>

            <p className="text-xs text-[#FDF9F3]/80 font-sans leading-relaxed">
              This application models a secure android <strong>Room / SQLite</strong> architecture. It uses local storage entities for schema validation, ensuring that your details remain strictly in your device's browser sandbox cache.
            </p>

            <div className="mt-4 pt-4 border-t border-[#3C2A3F]/50 grid grid-cols-2 gap-4 text-[10px] font-mono text-[#FDF9F3]/60">
              <div>
                <span>SQLite tables:</span>
                <span className="text-[#FCE6D5] font-bold block mt-0.5">2 Active Tables</span>
              </div>
              <div>
                <span>Database Engine:</span>
                <span className="text-[#E9E3F5] font-bold block mt-0.5">Room 2.6.1 + SQLite</span>
              </div>
            </div>
          </div>

          {/* Reset / Demo Data Tools */}
          <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 flex flex-col gap-2.5">
            <h4 className="font-serif italic text-sm font-bold text-[#3C2A3F] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#3C2A3F]/60" />
              SQLite Factory Controls
            </h4>
            <p className="text-[11px] text-[#3C2A3F]/70 font-sans leading-relaxed">
              Drop database tables and recreate with simulated test logs to verify calculations instantly.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                id="wipe-com-db-btn"
                onClick={handleClearDatabase}
                className="py-2.5 px-3 rounded-full border border-red-200 text-red-700 bg-red-50/40 hover:bg-red-50 text-[10px] font-sans font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3" />
                Clear DB
              </button>
              <button
                id="seed-demo-db-btn"
                onClick={handleRestoreDefaults}
                className="py-2.5 px-3 rounded-full border border-[#3C2A3F]/20 text-[#3C2A3F] bg-[#E9E3F5]/30 hover:bg-[#E9E3F5]/60 text-[10px] font-sans font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3" />
                Seed Demo
              </button>
            </div>
          </div>

          {/* SQLite DDL / Schema Viewer */}
          <div className="bg-[#1C131E] rounded-[24px] p-4 border border-[#3C2A3F]/10 font-mono text-xs overflow-hidden">
            <div className="flex justify-between items-center mb-2.5 text-[#FDF9F3]/50 pb-2 border-b border-[#3C2A3F]/30">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#FCE6D5]" />
                schema_definition.sql
              </span>
              <span className="text-[9px]">Room mapping</span>
            </div>
            <pre className="text-[#FCE6D5] leading-relaxed overflow-x-auto whitespace-pre p-1 select-all scrollbar-thin text-[10px]">
{`CREATE TABLE IF NOT EXISTS period_logs (
  date TEXT PRIMARY KEY, /* YYYY-MM-DD */
  flow_intensity TEXT,   /* spotting, light, medium, heavy */
  symptoms TEXT[],       /* cramps, headache, etc. */
  mood TEXT,             /* happy, tired, calm, anxious */
  notes TEXT             /* diary entry */
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);`}
            </pre>
          </div>

          {/* SQLite Terminal Query Monitor */}
          <div className="bg-[#1C131E] rounded-[24px] p-4 border border-[#3C2A3F]/10 font-mono text-xs flex flex-col h-60">
            <div className="flex justify-between items-center mb-2 text-[#FDF9F3]/50 pb-2 border-b border-[#3C2A3F]/30 shrink-0">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#E9E3F5]" />
                SQLite Trace Console
              </span>
              <span className="text-[8px] bg-[#3C2A3F] px-1.5 py-0.5 rounded text-white">LIVE TRACE</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin text-[10px]">
              {dbLogs.length === 0 ? (
                <div className="text-[#FDF9F3]/30 italic p-4 text-center">
                  No active logs. Click any button or record flow to trigger SQLite query logs.
                </div>
              ) : (
                dbLogs.map((log, idx) => (
                  <div key={idx} className="border-b border-[#3C2A3F]/30 pb-2">
                    <div className="flex justify-between items-center text-[8px] text-[#FDF9F3]/40 mb-1">
                      <span>[{log.timestamp}] status: {log.status}</span>
                      <span className="text-[#FCE6D5]">affected: {log.rowsAffected} row(s)</span>
                    </div>
                    <p className="text-[#FDF9F3]/90 break-words whitespace-pre-wrap">{log.statement}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        // ALERTS & NOTIFICATIONS SETTINGS VIEW
        <div className="space-y-5 pb-6">
          
          {/* Privacy Alert Badge */}
          <div className="bg-brand-lavender/60 border border-brand-text/10 rounded-[28px] p-4.5 flex gap-3.5 items-start transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-brand-text text-brand-bg flex items-center justify-center shrink-0 transition-colors duration-300">
              <ShieldCheck className="w-5 h-5 text-brand-peach" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-xs text-brand-text transition-colors duration-300">100% Offline & Private Alerts</h4>
              <p className="text-[10.5px] text-brand-text/75 font-sans mt-0.5 leading-relaxed transition-colors duration-300">
                All reminders and start notices are scheduled and processed fully locally on your sandboxed device database. No notifications or health metrics ever contact external cloud endpoints.
              </p>
            </div>
          </div>

          {/* App Appearance Section */}
          <div className="bg-brand-bg/95 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-lavender flex items-center justify-center text-brand-text shrink-0 transition-colors duration-300">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">App Appearance</h3>
                <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Customize your workspace aesthetic</p>
              </div>
            </div>

            <p className="text-[10.5px] text-brand-text/75 font-sans leading-relaxed transition-colors duration-300">
              Toggle between beautifully coordinated, soft color palettes designed to soothe and support your daily wellness rituals.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { 
                  id: 'default', 
                  name: 'Aesthetic Rose', 
                  colors: ['#FCE4E6', '#F7A8B8', '#E45B75'] 
                },
                { 
                  id: 'warm-peach', 
                  name: 'Warm Peach', 
                  colors: ['#FCD8C1', '#FEE8C8', '#F5C7C7'] 
                },
                { 
                  id: 'soft-mint', 
                  name: 'Soft Mint', 
                  colors: ['#D6EFE0', '#D3EAEB', '#FCF0C8'] 
                },
                { 
                  id: 'twilight-dark', 
                  name: 'OLED Crimson', 
                  colors: ['#2B0C11', '#E33E5A', '#FF6685'] 
                }
              ].map((p) => {
                const isActive = theme === p.id;
                return (
                  <button
                    key={p.id}
                    id={`theme-btn-${p.id}`}
                    onClick={() => {
                      onThemeChanged(p.id);
                      playSubtleBeep();
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-22 group ${
                      isActive 
                        ? 'border-brand-text bg-white shadow-md scale-[1.02]' 
                        : 'border-brand-text/10 bg-white/45 hover:bg-white/90 hover:border-brand-text/20'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-sans font-bold text-brand-text/50 block uppercase tracking-wider transition-colors duration-300">
                        PALETTE
                      </span>
                      <span className="font-serif italic text-xs font-bold text-brand-text leading-tight block mt-0.5 transition-colors duration-300">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex gap-1 mt-2.5">
                      {p.colors.map((c, i) => (
                        <div 
                          key={i} 
                          className="w-3.5 h-3.5 rounded-full border border-brand-text/5 shadow-sm shrink-0" 
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 animate-fade-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Android Home Screen Widgets Card */}
          <div className="bg-brand-bg/95 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-peach flex items-center justify-center text-brand-text shrink-0 border border-brand-text/5 transition-colors duration-300">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">Glance Home Widgets</h3>
                <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Offline Android Jetpack Compose widgets</p>
              </div>
            </div>

            <p className="text-[10.5px] text-brand-text/75 font-sans leading-relaxed transition-colors duration-300">
              Your home widgets (Small 2x2 Quick Glance and Medium 4x2 Daily Action Board) are beautifully styled and fully integrated directly to your local sandboxed room database. Tapping or using them automatically syncs data inside Sanctuary.
            </p>

            <div className="grid grid-cols-2 gap-2 text-center pt-1.5">
              <div className="p-2.5 rounded-2xl bg-brand-lavender/30 border border-brand-text/5 text-left">
                <span className="text-[8.5px] font-sans font-bold text-brand-text/50 uppercase block">Widget A</span>
                <span className="font-serif italic text-[11px] font-bold text-brand-text mt-0.5 block leading-tight">2x2 Quick Glance</span>
                <span className="text-[8px] font-mono text-emerald-600 font-bold mt-1 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                  ● ACTIVE
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#FCE6D5]/30 border border-[#3C2A3F]/5 text-left">
                <span className="text-[8.5px] font-sans font-bold text-brand-text/50 uppercase block">Widget B</span>
                <span className="font-serif italic text-[11px] font-bold text-brand-text mt-0.5 block leading-tight">4x2 Action Board</span>
                <span className="text-[8px] font-mono text-emerald-600 font-bold mt-1 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                  ● ACTIVE
                </span>
              </div>
            </div>

            <button
              id="view-home-screen-widgets-btn"
              onClick={() => {
                if (onMinimizeApp) onMinimizeApp();
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const bgain = audioCtx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(450, audioCtx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.12);
                  bgain.gain.setValueAtTime(0.02, audioCtx.currentTime);
                  bgain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                  osc.connect(bgain);
                  bgain.connect(audioCtx.destination);
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.15);
                } catch (e) {}
              }}
              className="w-full py-2.5 rounded-2xl bg-brand-text text-brand-bg font-sans font-bold text-xs hover:bg-brand-text/90 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border-none outline-none"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Preview Widgets on Home Screen</span>
            </button>
          </div>

          {/* Module 1: Period Start alerts */}
          <div className="bg-brand-bg/80 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-pink flex items-center justify-center text-brand-text shrink-0 border border-brand-text/5 transition-colors duration-300">
                  <BellRing className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">Predicted Period Alarm</h3>
                  <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Advance alert for your next start window</p>
                </div>
              </div>
              
              {/* Switch toggle */}
              <button 
                onClick={() => handleToggleSetting('notification_period_enabled', periodAlertEnabled, setPeriodAlertEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center ${
                  periodAlertEnabled ? 'bg-emerald-600' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  periodAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {periodAlertEnabled && (
              <div className="pt-3 border-t border-brand-text/5 flex flex-col gap-2 transition-colors duration-300">
                <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-brand-text/50 transition-colors duration-300">
                  Notification Schedule Offset
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 0, label: 'Same day' },
                    { val: 1, label: '1 day early' },
                    { val: 2, label: '2 days early' },
                    { val: 3, label: '3 days early' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => handleSelectSetting('notification_period_days_before', String(opt.val), setPeriodDaysBefore)}
                      className={`py-1.5 px-1 text-center rounded-xl text-[9px] font-sans font-bold border transition-all ${
                        periodDaysBefore === opt.val
                          ? 'bg-brand-text text-white border-transparent shadow-sm'
                          : 'bg-white text-brand-text/70 border-brand-text/10 hover:border-brand-text/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Module 2: Evening Cycle reminder */}
          <div className="bg-brand-bg/80 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-text shrink-0 border border-brand-text/5 transition-colors duration-300">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">Daily Logging Reminder</h3>
                  <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Keep a highly accurate historical cycle log</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleToggleSetting('notification_cycle_enabled', cycleAlertEnabled, setCycleAlertEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center ${
                  cycleAlertEnabled ? 'bg-emerald-600' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  cycleAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {cycleAlertEnabled && (
              <div className="pt-3 border-t border-brand-text/5 flex items-center justify-between transition-colors duration-300">
                <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-brand-text/50 transition-colors duration-300">
                  Preferred Alert Time
                </label>
                <input 
                  type="time" 
                  value={cycleTime} 
                  onChange={(e) => handleSelectSetting('notification_cycle_time', e.target.value, setCycleTime)}
                  className="px-3 py-1.5 rounded-xl border border-brand-text/10 font-mono text-xs text-brand-text bg-white hover:border-brand-text/20 focus:outline-none focus:ring-1 focus:ring-brand-text transition-all duration-300"
                />
              </div>
            )}
          </div>

          {/* Module 3: Self-care tips notifications */}
          <div className="bg-brand-bg/80 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-peach flex items-center justify-center text-brand-text shrink-0 border border-brand-text/5 transition-colors duration-300">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">Phase Wise Self-Care Drops</h3>
                  <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Gentle insights matching active cycle phase</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleToggleSetting('notification_self_care_enabled', selfCareEnabled, setSelfCareEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center ${
                  selfCareEnabled ? 'bg-emerald-600' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  selfCareEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Privacy & Security Lock Settings Card */}
          <div className="bg-brand-bg/95 border border-brand-text/10 rounded-[32px] p-5 shadow-sm space-y-4 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-lavender flex items-center justify-center text-brand-text shrink-0 border border-brand-text/5 transition-colors duration-300">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-serif italic text-base font-bold text-brand-text transition-colors duration-300">Security App Lock</h3>
                  <p className="text-[10px] text-brand-text/60 font-sans font-semibold transition-colors duration-300">Lock vault when app is closed or minimized</p>
                </div>
              </div>
              
              <button 
                id="toggle-lock-btn"
                onClick={handleToggleLock}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center ${
                  securityLockEnabled ? 'bg-emerald-600' : 'bg-brand-text/15'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                  securityLockEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {securityLockEnabled && (
              <div className="pt-3 border-t border-brand-text/5 space-y-3.5 transition-colors duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-brand-text/50">
                    Vault 4-Digit PIN
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-text bg-brand-lavender/40 px-2.5 py-1 rounded-md">
                      {securityPin}
                    </span>
                    <button
                      id="change-pin-btn"
                      onClick={() => setShowPinChange(!showPinChange)}
                      className="text-[9px] font-sans font-bold text-brand-text/65 hover:text-brand-text bg-brand-lavender/70 px-2 py-1 rounded-md border border-brand-text/5 active:scale-95 transition-all cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {showPinChange && (
                  <div className="flex gap-2 items-center animate-fade-in bg-white/45 p-2 rounded-xl border border-brand-text/5">
                    <input 
                      type="text"
                      maxLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="New PIN"
                      className="px-2.5 py-1.5 rounded-lg border border-brand-text/10 font-mono text-xs text-brand-text bg-white w-24 focus:outline-none focus:border-brand-text/30"
                    />
                    <button
                      id="save-pin-btn"
                      onClick={handleSavePin}
                      className="px-3 py-1.5 bg-brand-text text-white font-sans font-bold text-[9px] uppercase tracking-wider rounded-lg border border-transparent hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-brand-text/50">
                    Fingerprint Unlock
                  </span>
                  <button 
                    id="toggle-biometric-btn"
                    onClick={handleToggleBiometric}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center ${
                      biometricEnabled ? 'bg-emerald-600' : 'bg-brand-text/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                      biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Simulated Sandbox Testbed Area */}
          <div className="bg-[#3C2A3F] text-white rounded-[32px] p-5 shadow-md space-y-3.5">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#FCE6D5] animate-pulse" />
              <h3 className="font-serif italic text-base font-bold text-white">Alert Delivery Simulator</h3>
            </div>
            <p className="text-[10px] text-[#FDF9F3]/75 font-sans leading-relaxed">
              Test how alerts appear and ring. Tapping any button will fire a real-time local notification drop-down banner accompanied by a custom offline multi-tone chime melody.
            </p>
            
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => {
                  playSubtleBeep();
                  if (onTriggerNotification) {
                    const offsetStr = periodDaysBefore === 0 
                      ? "today" 
                      : periodDaysBefore === 1 
                        ? "tomorrow" 
                        : `in ${periodDaysBefore} days`;
                    onTriggerNotification(
                      "Predicted Period Window Notice",
                      `Gentle Reminder: Your next period is predicted to begin ${offsetStr}. Keep a comfort kit close by and prepare for calm days. 🌸`,
                      "period"
                    );
                  }
                }}
                disabled={!periodAlertEnabled}
                className={`py-2 px-1 rounded-xl text-[9px] font-sans font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  periodAlertEnabled 
                    ? 'bg-[#F7D9E3] text-[#3C2A3F] hover:bg-[#ebd0da] active:scale-95' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <span className="text-sm">🩸</span>
                <span>Test Start</span>
              </button>

              <button
                onClick={() => {
                  playSubtleBeep();
                  if (onTriggerNotification) {
                    onTriggerNotification(
                      "Daily Tracking Reminder",
                      "Peaceful moment: Time to record flow levels and physical symptoms to maintain your cycle stats profile. 🧘‍♀️",
                      "reminder"
                    );
                  }
                }}
                disabled={!cycleAlertEnabled}
                className={`py-2 px-1 rounded-xl text-[9px] font-sans font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  cycleAlertEnabled 
                    ? 'bg-[#E9E3F5] text-[#3C2A3F] hover:bg-[#ded7ea] active:scale-95' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <span className="text-sm">🧘‍♀️</span>
                <span>Test Daily</span>
              </button>

              <button
                onClick={() => {
                  playSubtleBeep();
                  if (onTriggerNotification) {
                    onTriggerNotification(
                      "Ovulatory Self-Care Wisdom",
                      "Hormone peak insight: Your active estrogen level is at maximum. Enjoy creativity, light social walks, and stay hydrated. ✨",
                      "self_care"
                    );
                  }
                }}
                disabled={!selfCareEnabled}
                className={`py-2 px-1 rounded-xl text-[9px] font-sans font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  selfCareEnabled 
                    ? 'bg-[#FCE6D5] text-[#3C2A3F] hover:bg-[#f1dac9] active:scale-95' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <span className="text-sm">✨</span>
                <span>Test Wisdom</span>
              </button>
            </div>
            
            {!periodAlertEnabled && !cycleAlertEnabled && !selfCareEnabled && (
              <div className="pt-2">
                <AestheticEmptyState 
                  type="bell"
                  title="All Notifications Paused"
                  description="Toggle any of the period alarm or daily reminder switches above to activate localized private updates."
                />
              </div>
            )}
          </div>

        </div>
      )}

    </motion.div>
  );
}

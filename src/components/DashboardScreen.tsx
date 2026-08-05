/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CalendarHeart, Droplet, Coffee, Moon, Heart, GlassWater, Plus, RotateCcw, MessageCircle, Send, Mic, Bot, User, X, Globe, Volume2, VolumeX, Paperclip, Image, Camera, Settings, Radio } from 'lucide-react';
import { roomDb, formatDate, parseDateString } from '../db/roomDb';

interface DashboardScreenProps {
  onOpenLog: (date: string) => void;
  stats: ReturnType<typeof roomDb.calculateStats>;
  todayStr: string; // YYYY-MM-DD
  onDbUpdated?: () => void;
  onOpenSettings?: () => void;
  userName?: string | null;
  userPhotoURL?: string | null;
}

// Curated list of self-care insights based on the cycle phase
interface SelfCareInsight {
  phase: string;
  tip: string;
  icon: React.ReactNode;
  bg: string;
  accent: string;
}

export function DashboardScreen({ onOpenLog, stats, todayStr, onDbUpdated, onOpenSettings, userName, userPhotoURL }: DashboardScreenProps) {
  // Persistent daily water tracker state
  const [waterIntake, setWaterIntake] = useState(() => {
    return Number(roomDb.getSetting(`water_intake_${todayStr}`, '0'));
  });

  // Health Companion Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [transcriptLive, setTranscriptLive] = useState('');
  const recognitionRef = React.useRef<any>(null);
  const utteranceRef = React.useRef<any>(null);

  const [messages, setMessages] = useState<Array<{ 
    sender: 'bot' | 'user'; 
    text: string; 
    timestamp: string;
    sources?: Array<{ title: string; uri: string }>;
    image?: { base64: string; mimeType: string };
  }>>([
    {
      sender: 'bot',
      text: "Welcome to your Dinocycle assistant! 🦖 I am now powered by Gemini, silently aware of your local cycle phase and symptoms to provide deeply personalized, secure, and scientifically accurate health care tips. Ask me anything, or speak-log symptoms to update your database.",
      timestamp: '12:00 PM'
    }
  ]);

  const handleAddWater = () => {
    const newVal = Math.min(waterIntake + 250, 2000);
    setWaterIntake(newVal);
    roomDb.saveSetting(`water_intake_${todayStr}`, String(newVal));
  };

  const handleResetWater = () => {
    setWaterIntake(0);
    roomDb.saveSetting(`water_intake_${todayStr}`, '0');
  };

  // Let's determine which phase we are currently in based on calculated stats
  const cycleInfo = useMemo(() => {
    const { averageCycleLength, averagePeriodLength, lastPeriodStartDate } = stats;
    
    if (!lastPeriodStartDate) {
      // No past logs, assume starting today for visual demonstration
      return {
        cycleDay: 1,
        daysToPeriod: 0,
        isPeriodToday: true,
        isAnomaly: false,
        phaseName: 'Menstrual Phase',
        phaseDescription: 'Your body is resting and renewing. Be gentle with yourself.',
        phaseColor: 'from-[#E9E3F5] to-[#FDF9F3]',
        borderColor: 'border-[#E9E3F5]'
      };
    }

    const todayDate = parseDateString(todayStr);
    const lastStartDate = parseDateString(lastPeriodStartDate);
    
    const diffTime = todayDate.getTime() - lastStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const isAnomaly = diffDays > 38;

    // Cycle day is 1-indexed (e.g. if today == lastStartDate, cycleDay = 1)
    let cycleDay = isAnomaly ? (diffDays + 1) : ((diffDays % averageCycleLength) + 1);
    if (!isAnomaly && cycleDay <= 0) {
      cycleDay = averageCycleLength + cycleDay;
    }

    const isPeriodToday = !isAnomaly && (cycleDay <= averagePeriodLength);
    let daysToPeriod = 0;
    
    if (isAnomaly) {
      daysToPeriod = 0;
    } else if (isPeriodToday) {
      daysToPeriod = 0;
    } else {
      daysToPeriod = averageCycleLength - cycleDay + 1;
    }

    // Determine menstrual cycle phase based on cycleDay
    let phaseName = 'Follicular Phase';
    let phaseDescription = 'Estrogen is rising! Energy, focus, and creativity are boosting.';
    let phaseColor = 'from-[#FCE6D5] to-[#FDF9F3]'; // warm peach
    let borderColor = 'border-[#FCE6D5]';

    if (isAnomaly) {
      phaseName = 'Extended Cycle';
      phaseDescription = 'Your body might be taking extra time to regulate this month. Take a quiet breath.';
      phaseColor = 'from-[#FCE6D5] to-[#E9E3F5]'; // dusty cream-peach-lavender
      borderColor = 'border-[#E9E3F5]';
    } else if (isPeriodToday) {
      phaseName = 'Menstrual Phase';
      phaseDescription = 'A time for rest, comfort, and restorative slow movements.';
      phaseColor = 'from-[#E9E3F5] to-[#FDF9F3]'; // lavender/creme
      borderColor = 'border-[#E9E3F5]';
    } else if (cycleDay > averagePeriodLength && cycleDay <= 12) {
      phaseName = 'Follicular Phase';
      phaseDescription = 'Your energy is blooming. Try light exercise and enjoy learning new ideas!';
      phaseColor = 'from-[#FCE6D5] to-[#FDF9F3]'; // warm peach/cream
      borderColor = 'border-[#FCE6D5]';
    } else if (cycleDay >= 13 && cycleDay <= 16) {
      phaseName = 'Ovulatory Phase';
      phaseDescription = 'Peak confidence and communication. Your body feels vibrant and glowing!';
      phaseColor = 'from-[#F7D9E3] to-[#FDF9F3]'; // soft pink
      borderColor = 'border-[#F7D9E3]';
    } else if (cycleDay > 16) {
      phaseName = 'Luteal Phase';
      phaseDescription = 'Body begins slowing down. Focus on soothing rituals, sleep, and chocolate.';
      phaseColor = 'from-[#E9E3F5] to-[#FDF9F3]'; // dusty lavender
      borderColor = 'border-[#E9E3F5]/80';
    }

    return {
      cycleDay,
      daysToPeriod,
      isPeriodToday,
      isAnomaly,
      phaseName,
      phaseDescription,
      phaseColor,
      borderColor
    };
  }, [stats, todayStr]);

  // Get self-care tip suited for current phase
  const activeInsight = useMemo((): SelfCareInsight => {
    if (cycleInfo.isPeriodToday) {
      return {
        phase: 'Menstrual',
        tip: 'A little tired or experiencing cramps? Try sipping warm ginger or chamomile tea, and place a cozy heat pad on your tummy. Hydration is key!',
        icon: <Coffee className="w-5 h-5 text-[#3C2A3F]" />,
        bg: 'bg-[#E9E3F5] border-[#E9E3F5]',
        accent: 'text-[#3C2A3F]'
      };
    } else if (cycleInfo.cycleDay <= 12) {
      return {
        phase: 'Follicular',
        tip: 'Your brain power is rising! This is a great week to set intentions, plan projects, or start that new hobby you have been thinking about.',
        icon: <Sparkles className="w-5 h-5 text-[#3C2A3F]" />,
        bg: 'bg-[#FCE6D5] border-[#FCE6D5]',
        accent: 'text-[#3C2A3F]'
      };
    } else if (cycleInfo.cycleDay >= 13 && cycleInfo.cycleDay <= 16) {
      return {
        phase: 'Ovulatory',
        tip: 'Your social energy is peaking. Schedule that hang-out with friends, or engage in high-energy activities. Your natural glow is unmatched!',
        icon: <Heart className="w-5 h-5 text-[#3C2A3F]" />,
        bg: 'bg-[#F7D9E3] border-[#F7D9E3]',
        accent: 'text-[#3C2A3F]'
      };
    } else {
      return {
        phase: 'Luteal',
        tip: 'A bit of moodiness or cravings are natural now. Focus on wholesome, fiber-rich snacks, slow stretching, and getting 8+ hours of sleep.',
        icon: <Moon className="w-5 h-5 text-[#3C2A3F]" />,
        bg: 'bg-[#E9E3F5] border-[#E9E3F5]/60',
        accent: 'text-[#3C2A3F]'
      };
    }
  }, [cycleInfo]);

  const cycleProgress = useMemo(() => {
    const total = stats.averageCycleLength || 28;
    return Math.min(Math.max(cycleInfo.cycleDay / total, 0.01), 1.0);
  }, [cycleInfo.cycleDay, stats.averageCycleLength]);

  // Symptom-Triggered Proactive AI Logic
  const activeProactiveSymptom = useMemo(() => {
    const logs = roomDb.getAllLogs();
    const todayLog = logs.find(l => l.date === todayStr);
    if (!todayLog) return null;

    const hasCramps = todayLog.symptoms.includes('cramps') || todayLog.notes?.toLowerCase().includes('cramp');
    const hasAnxiety = todayLog.mood === 'anxious' || todayLog.symptoms.includes('mood_swings') || todayLog.notes?.toLowerCase().includes('anxious') || todayLog.notes?.toLowerCase().includes('anxiety');

    if (hasCramps) {
      return {
        type: 'cramps' as const,
        title: "Tough Cramps Detected",
        message: "I noticed you're having tough cramps today. Want me to suggest some quick relief exercises or teas?",
        actionText: "Ask Dinocycle AI for Relief",
      };
    } else if (hasAnxiety) {
      return {
        type: 'anxiety' as const,
        title: "High Anxiety Detected",
        message: "I noticed you're feeling anxious today. Want to try some grounding exercises or relaxing teas?",
        actionText: "Calm Mind with Dinocycle AI",
      };
    }
    return null;
  }, [stats, todayStr, messages]); // refresh when logs/messages change

  const triggerProactiveChat = (symptomType: 'cramps' | 'anxiety') => {
    setIsChatOpen(true);
    const promptText = symptomType === 'cramps' 
      ? "Suggest some quick relief exercises or teas for tough menstrual cramps." 
      : "Suggest some grounding exercises or relaxing teas for anxiety.";
    setInputText('');
    handleSendMessage(promptText);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex-1 flex flex-col justify-between overflow-y-auto px-6 py-5 space-y-5"
    >
      
      {/* Upper Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#3C2A3F]/60 font-bold font-sans">
            SISTERHOOD SANCTUARY
          </span>
          <h2 className="font-serif italic text-3xl text-[#3C2A3F] font-semibold mt-0.5">
            Hello, {userName || 'Dear One'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            onClick={onOpenSettings}
            whileHover={{ scale: 1.05, rotate: 30 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-[#E9E3F5] flex items-center justify-center text-[#3C2A3F] border border-[#3C2A3F]/5 shadow-sm cursor-pointer outline-none"
            title="Open Settings & Profile"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Host Announcement Notice Banner if active */}
      {roomDb.getSetting('admin_broadcast_notice', '') && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#E9E3F5] border border-[#3C2A3F]/15 rounded-[28px] p-4 flex gap-3.5 items-start shadow-sm"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#3C2A3F] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Radio className="w-4.5 h-4.5 text-[#F7D9E3] animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono font-bold text-[#3C2A3F]/55 uppercase tracking-widest">
              HOST ANNOUNCEMENT
            </span>
            <p className="text-xs text-[#3C2A3F] font-sans font-bold leading-relaxed">
              {roomDb.getSetting('admin_broadcast_notice', '')}
            </p>
          </div>
        </motion.div>
      )}

      {/* Grid Layout Wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Cycle Anomaly Banner: Spans full width on desktop if present */}
        {cycleInfo.isAnomaly && (
          <div className="col-span-1 md:col-span-2">
            <motion.div
              id="cycle-anomaly-warning-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FCE6D5] border border-[#3C2A3F]/10 rounded-[28px] p-4.5 flex gap-3.5 items-start shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-[#3C2A3F] text-white flex items-center justify-center shrink-0">
                <span className="text-base">🌸</span>
              </div>
              <div>
                <h4 className="font-serif italic text-xs font-bold text-[#3C2A3F]">
                  Your cycle is taking a little longer this month
                </h4>
                <p className="text-[10px] text-[#3C2A3F]/80 font-sans mt-0.5 leading-relaxed">
                  Log your period when it arrives, or consult a doctor if you feel unwell.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Left Column: Core Cycle Dome Card & Main Call-to-Action */}
        <div className="flex flex-col items-center justify-center space-y-4 bg-[#FDF9F3]/40 border border-[#3C2A3F]/5 rounded-[32px] p-5">
          {/* Main Arch Dome Container */}
          <div className="flex flex-col items-center justify-center py-1">
            <div 
              className={`w-60 h-76 rounded-t-full rounded-b-[40px] border-2 flex flex-col items-center justify-between py-8 px-5 bg-gradient-to-b ${cycleInfo.phaseColor} ${cycleInfo.borderColor} shadow-sm relative overflow-hidden transition-all duration-500`}
            >
              {/* Subtle decorative background sparkles */}
              <div className="absolute top-8 left-8 text-[#3C2A3F]/10 text-lg">✦</div>
              <div className="absolute bottom-16 right-8 text-[#3C2A3F]/10 text-base">✦</div>

              {/* Arch Dome Header */}
              <div className="flex flex-col items-center pt-2">
                <span className="text-[10px] uppercase tracking-widest text-[#3C2A3F] font-bold font-sans px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-[#3C2A3F]/5">
                  {cycleInfo.phaseName}
                </span>
              </div>

              {/* Central Highlight Metric with elegant Cycle Progress Ring */}
              <div className="flex flex-col items-center justify-center my-2 relative">
                {/* Soft decorative radial aura behind the day text */}
                <div className="absolute w-28 h-28 bg-white/60 rounded-full blur-xl" />
                
                <svg className="w-36 h-36 transform -rotate-90 relative z-10">
                  <defs>
                    <linearGradient id="cycleProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F7A8B8" />
                      <stop offset="100%" stopColor="#E45B75" />
                    </linearGradient>
                  </defs>
                  {/* Background circular track */}
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    className="stroke-[#3C2A3F]/10 fill-none"
                    strokeWidth="4"
                  />
                  {/* Animated active path representing cycle progression */}
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke="url(#cycleProgressGradient)"
                    className="fill-none"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "389.56", strokeDashoffset: "389.56" }}
                    animate={{ strokeDashoffset: 389.56 * (1 - cycleProgress) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>

                {/* Inner day details positioned absolutely inside the SVG track */}
                <div className="absolute text-center z-20">
                  <span className="font-serif text-4xl font-semibold text-[#3C2A3F] tracking-tight block leading-none">
                    Day {cycleInfo.cycleDay}
                  </span>
                  <span className="text-[9px] font-sans text-[#3C2A3F]/60 font-bold tracking-wider uppercase mt-1 block">
                    of your cycle
                  </span>
                </div>
              </div>

              {/* Arch Dome Footer: Days to Period */}
              <div className="text-center z-10 w-full px-2">
                {cycleInfo.isAnomaly ? (
                  <div className="text-[11px] font-sans font-bold text-[#3C2A3F]/70 flex flex-col gap-0.5">
                    <span className="uppercase tracking-wider opacity-60">Cycle Status</span>
                    <span className="text-xs font-serif italic font-bold text-[#D87654]">
                      Awaiting Period 🌸
                    </span>
                  </div>
                ) : cycleInfo.isPeriodToday ? (
                  <div className="flex items-center justify-center gap-1.5 text-white bg-[#3C2A3F] py-1.5 px-3 rounded-full shadow-sm">
                    <Droplet className="w-3.5 h-3.5 fill-white animate-bounce" />
                    <span className="text-[11px] font-bold font-sans tracking-wide uppercase">Period Active</span>
                  </div>
                ) : (
                  <div className="text-[11px] font-sans font-bold text-[#3C2A3F]/70 flex flex-col gap-0.5">
                    <span className="uppercase tracking-wider opacity-60">Next period starts in</span>
                    <span className="text-sm font-serif italic font-bold text-[#3C2A3F]">
                      {cycleInfo.daysToPeriod} days
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Phase Quick Description */}
            <p className="text-[11px] text-[#3C2A3F]/70 text-center max-w-xs mt-3.5 font-sans leading-relaxed px-4">
              "{cycleInfo.phaseDescription}"
            </p>
          </div>

          {/* Action CTA Section */}
          <div className="w-full flex justify-center">
            <motion.button
              id="log-flow-dashboard-btn"
              onClick={() => onOpenLog(todayStr)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="w-full max-w-sm py-4 rounded-full bg-[#3C2A3F] hover:bg-[#523B56] text-sm font-sans font-semibold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] touch-manipulation"
            >
              <CalendarHeart className="w-4 h-4" />
              Log Today's Flow & Feelings
            </motion.button>
          </div>
        </div>

        {/* Right Column: Other Widgets & Support Cards */}
        <div className="space-y-5">
          {/* Water Intake Tracker Section */}
          <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#E9E3F5] text-[#3C2A3F] flex items-center justify-center shrink-0 shadow-sm">
                  <GlassWater className="w-5 h-5 text-[#3C2A3F]" />
                </div>
                <div>
                  <span className="text-[10px] font-sans font-bold tracking-wider text-[#3C2A3F]/50 block">
                    DAILY HYDRATION
                  </span>
                  <span className="text-xs font-serif italic font-bold text-[#3C2A3F]">
                    {waterIntake} ml / 2000 ml
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {waterIntake > 0 && (
                  <motion.button
                    id="reset-water-btn"
                    onClick={handleResetWater}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.1 }}
                    className="w-8 h-8 rounded-full bg-[#FCE6D5]/60 hover:bg-[#FCE6D5] text-[#3C2A3F] flex items-center justify-center transition-all cursor-pointer min-w-[32px] min-h-[32px] touch-manipulation"
                    title="Reset Intake"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <motion.button
                  id="add-water-btn"
                  onClick={handleAddWater}
                  disabled={waterIntake >= 2000}
                  whileTap={waterIntake < 2000 ? { scale: 0.95 } : {}}
                  whileHover={waterIntake < 2000 ? { scale: 1.05 } : {}}
                  className={`h-9 px-4 rounded-full text-xs font-sans font-bold text-white flex items-center gap-1 transition-all cursor-pointer min-h-[36px] touch-manipulation ${
                    waterIntake >= 2000
                      ? 'bg-emerald-600/50 cursor-not-allowed text-white/80'
                      : 'bg-[#3C2A3F] hover:bg-[#523B56]'
                  }`}
                >
                  {waterIntake >= 2000 ? (
                    <span>Done! ✨</span>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>250ml</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Dynamic Rounded Progress Bar with Liquid Filling Swell effect */}
            <div className="space-y-1">
              <div className="w-full bg-[#3C2A3F]/5 rounded-full h-3 overflow-hidden relative">
                <motion.div
                  className="bg-gradient-to-r from-[#E9E3F5] via-[#F7D9E3] to-[#FCE6D5] h-full rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((waterIntake / 2000) * 100, 100)}%` }}
                  transition={{ type: 'spring', damping: 15, stiffness: 80 }}
                >
                  {/* Liquid shimmer ripple effect */}
                  <motion.div 
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  />
                </motion.div>
              </div>
              <div className="flex justify-between text-[9px] font-sans font-semibold text-[#3C2A3F]/50">
                <span>Goal: 2000 ml</span>
                <span>{Math.round(Math.min((waterIntake / 2000) * 100, 100))}% completed</span>
              </div>
            </div>
          </div>

          {/* Symptom-Triggered Proactive AI Card */}
          {activeProactiveSymptom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-gradient-to-r from-[#F7D9E3] to-[#FDF9F3] border border-brand-pink rounded-[28px] p-4 flex gap-3.5 items-center shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-brand-pink rounded-bl-2xl text-[9px] uppercase tracking-wider font-extrabold text-[#3C2A3F] font-sans scale-90">
                AI Care Assistant ✦
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-brand-pink shadow-xs">
                <Sparkles className="w-5 h-5 text-[#3C2A3F]" />
              </div>
              <div className="flex-1">
                <h4 className="font-serif italic text-[11.5px] font-bold text-[#3C2A3F]">{activeProactiveSymptom.title}</h4>
                <p className="text-[10px] text-[#3C2A3F]/85 font-sans leading-relaxed mt-1">
                  {activeProactiveSymptom.message}
                </p>
                <button
                  onClick={() => triggerProactiveChat(activeProactiveSymptom.type)}
                  className="mt-2.5 text-[9px] font-sans font-bold text-white bg-[#3C2A3F] hover:bg-[#523B56] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 min-h-[32px] touch-manipulation"
                >
                  <MessageCircle className="w-3 h-3 text-white" />
                  {activeProactiveSymptom.actionText}
                </button>
              </div>
            </motion.div>
          )}

          {/* Glance Widgets Promo Banner */}
          <div className="bg-[#E9E3F5]/40 border border-[#3C2A3F]/5 rounded-[28px] p-4 flex gap-3 items-center transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#3C2A3F]/5 shadow-sm text-lg select-none">
              📱
            </div>
            <div className="flex-1">
              <h4 className="font-serif italic text-[11.5px] font-bold text-[#3C2A3F] leading-tight">Glance Widgets Ready</h4>
              <p className="text-[9.5px] text-[#3C2A3F]/65 font-sans leading-relaxed mt-0.5">
                Tap the <strong>bottom Android gesture pill bar</strong> at the very base of the phone frame to minimize and interact with your offline Home widgets.
              </p>
            </div>
          </div>

          {/* Daily Self-Care Insights Card */}
          <div className="mt-auto">
            <span className="text-[10px] font-sans font-bold tracking-wider text-[#3C2A3F]/40 block mb-2">
              DAILY COMFORT INSIGHT
            </span>
            <div className={`rounded-[28px] border p-4.5 flex gap-3.5 transition-all duration-300 ${activeInsight.bg} bg-opacity-80`}>
              <div className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shrink-0 shadow-sm border border-white/40">
                {activeInsight.icon}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-[#3C2A3F]">
                  {activeInsight.phase} Phase Self-Care
                </span>
                <p className="text-xs text-[#3C2A3F]/80 font-sans mt-0.5 leading-relaxed">
                  {activeInsight.tip}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Chat Companion */}
      <div className="absolute bottom-6 right-5 z-40">
        <motion.button
          id="companion-chat-fab"
          onClick={() => {
            setIsChatOpen(true);
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
            } catch (e) {}
          }}
          whileHover={{ scale: 1.1, rotate: 3 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-full bg-[#3C2A3F] hover:bg-[#523B56] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(60,42,63,0.25)] border border-white/10 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      {/* Smart Health Companion Dialogue Screen Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            key="companion-chat-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="absolute inset-0 bg-brand-bg z-50 flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4.5 border-b border-brand-text/5 flex flex-col gap-3.5 bg-brand-lavender/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#3C2A3F] flex items-center justify-center text-white shadow-sm">
                    <Bot className="w-4.5 h-4.5 text-[#F7D9E3]" />
                  </div>
                  <div>
                    <h3 className="font-serif italic text-sm font-bold text-brand-text">Health Dinocycle AI</h3>
                    <span className="text-[8.5px] font-mono text-[#8B5CF6] font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-ping" />
                      100% SECURE & DATA-AWARE
                    </span>
                  </div>
                </div>
                <button
                  id="close-chat-btn"
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-brand-text/5 flex items-center justify-center text-brand-text/60 hover:text-brand-text transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gemini Feature Control Panel */}
              <div className="bg-white border border-[#3C2A3F]/5 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] font-sans text-brand-text/80 font-bold px-0.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
                    AI Assistant Settings
                  </span>
                  {selectedModel === 'gemini-3.1-pro-preview' && (
                    <span className="text-[8px] font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">
                      High Thinking Mode Active 🧠
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Model Selector */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-brand-text/45">Intelligence Base</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        const m = e.target.value;
                        setSelectedModel(m);
                        if (m === 'gemini-3.1-pro-preview') {
                          setThinkingMode(true);
                        } else {
                          setThinkingMode(false);
                        }
                      }}
                      className="bg-brand-bg border border-brand-text/10 rounded-lg px-2 py-1 text-[10px] text-brand-text focus:outline-none focus:border-brand-text/30 cursor-pointer"
                    >
                      <option value="gemini-3.1-flash-lite">⚡ Lite (Fast)</option>
                      <option value="gemini-3.5-flash">🌸 Balanced (Standard)</option>
                      <option value="gemini-3.1-pro-preview">🧠 Pro Preview (Thinking)</option>
                    </select>
                  </div>

                  {/* Google Search Grounding toggle */}
                  <div className="flex flex-col gap-0.5 justify-center">
                    <label className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-brand-text/45">Search Grounding</label>
                    <button
                      onClick={() => setSearchGrounding(prev => !prev)}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                        searchGrounding 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                          : 'bg-brand-bg border-brand-text/10 text-brand-text/75'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        Live Web Search
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${searchGrounding ? 'bg-emerald-500 animate-ping' : 'bg-gray-300'}`} />
                    </button>
                  </div>
                </div>

                {/* Empathetic TTS Voice Toggle Row */}
                <div className="flex items-center justify-between border-t border-[#3C2A3F]/5 pt-2 mt-1 px-0.5">
                  <span className="text-[9px] font-sans text-brand-text/75 font-bold flex items-center gap-1">
                    {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#8B5CF6]" /> : <VolumeX className="w-3.5 h-3.5 text-brand-text/40" />}
                    Empathetic Voice Assistant
                  </span>
                  <button
                    onClick={() => {
                      const updated = !isVoiceEnabled;
                      setIsVoiceEnabled(updated);
                      if (!updated) {
                        try {
                          window.speechSynthesis.cancel();
                        } catch (e) {}
                      }
                    }}
                    className={`px-2.5 py-1 text-[8px] font-mono font-extrabold rounded-lg border transition-all cursor-pointer ${
                      isVoiceEnabled 
                        ? 'bg-violet-50 border-violet-200 text-[#8B5CF6] hover:bg-violet-100' 
                        : 'bg-brand-bg border-brand-text/10 text-brand-text/50 hover:bg-brand-text/5'
                    }`}
                  >
                    {isVoiceEnabled ? '🔊 ON (READ)' : '🔇 OFF (MUTE)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4.5 space-y-3.5 scroll-smooth">
              {messages.map((msg, idx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-start gap-2.5 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-brand-text/5 text-[10px] ${
                      isBot ? 'bg-[#3C2A3F] text-white' : 'bg-[#FCE6D5] text-[#3C2A3F]'
                    }`}>
                      {isBot ? <Bot className="w-3 h-3 text-[#F7D9E3]" /> : <User className="w-3 h-3" />}
                    </div>
                    <div className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      isBot 
                        ? 'bg-brand-lavender/35 text-brand-text border border-brand-text/5 shadow-xs' 
                        : 'bg-[#FCE6D5] text-[#3C2A3F] rounded-tr-none border border-[#FCE6D5]/60 shadow-sm'
                    }`}>
                      <div>{msg.text}</div>

                      {msg.image && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#3C2A3F]/10 max-w-full shadow-xs">
                          <img 
                            src={`data:${msg.image.mimeType};base64,${msg.image.base64}`} 
                            alt="Uploaded state scan" 
                            className="max-h-48 object-cover w-full rounded-lg"
                          />
                        </div>
                      )}
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#3C2A3F]/5">
                          <span className="text-[7.5px] font-mono font-bold uppercase tracking-wide text-brand-text/50 block mb-1">
                            Grounded Sources & medical citations:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-[#F5F0FC] border border-brand-text/5 hover:border-[#A78BFA] text-[#8B5CF6] text-[8px] px-2 py-0.5 rounded-full transition-all max-w-full truncate font-medium hover:underline"
                              >
                                <Globe className="w-2 h-2 text-[#8B5CF6] shrink-0" />
                                <span className="truncate">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="block text-[8px] opacity-40 text-right mt-1.5 font-mono font-bold uppercase">
                        {msg.timestamp}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {isAiLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 max-w-[85%] mr-auto animate-pulse"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-brand-text/5 text-[10px] bg-[#3C2A3F] text-white">
                    <Bot className="w-3 h-3 text-[#F7D9E3]" />
                  </div>
                  <div className="rounded-2xl p-3 text-xs leading-relaxed bg-brand-lavender/35 text-brand-text border border-brand-text/5 flex items-center gap-1.5 shadow-xs">
                    <span className="text-[10px] italic">Sister Assistant typing...</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#3C2A3F]/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-1.5 h-1.5 bg-[#3C2A3F]/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 bg-[#3C2A3F]/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </span>
                  </div>
                </motion.div>
              )}

              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 bg-[#E9E3F5]/40 border border-[#3C2A3F]/10 rounded-2xl p-3 max-w-[80%] mr-auto"
                >
                  <Mic className="w-4 h-4 text-[#3C2A3F] animate-bounce" />
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold tracking-wider text-[#3C2A3F]/60">Listening to voice...</span>
                    <div className="flex gap-1">
                      <span className="w-1 h-3.5 bg-[#3C2A3F]/30 rounded animate-pulse" />
                      <span className="w-1 h-5.5 bg-[#3C2A3F]/60 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <span className="w-1 h-4 bg-[#3C2A3F] rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-2 bg-[#3C2A3F]/40 rounded animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-5 py-2.5 flex gap-2 overflow-x-auto whitespace-nowrap bg-brand-lavender/5 border-t border-brand-text/5 shrink-0 select-none">
              {[
                { label: 'Sugar cravings? 🍫', text: 'Why am I craving sugar?' },
                { label: 'Ease cramps ⚡', text: 'How to reduce cramps?' },
                { label: 'Low energy? 💤', text: 'Why am I so tired?' },
                { label: 'Bloating tips 🎈', text: 'Bloating tips please' }
              ].map((faq, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(faq.text)}
                  className="py-1.5 px-3 rounded-full bg-white text-brand-text/80 text-[10px] font-sans font-bold border border-brand-text/10 hover:border-brand-text/25 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  {faq.label}
                </button>
              ))}
            </div>

            {/* Image attachment hidden input */}
            <input 
              type="file" 
              id="chat-file-input" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange} 
            />

            {/* Selected Image Preview Box */}
            {selectedImage && (
              <div className="px-5 py-2.5 bg-violet-50/75 border-t border-brand-text/5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#3C2A3F]/15 relative shrink-0">
                    <img 
                      src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} 
                      alt="Selected attachment" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-sans font-bold text-brand-text truncate max-w-[180px]">
                      {selectedImage.name}
                    </span>
                    <span className="text-[8px] font-mono text-emerald-600 font-extrabold tracking-wide uppercase flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                      Vision Attachment Connected
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="w-6 h-6 rounded-full hover:bg-[#3C2A3F]/5 flex items-center justify-center text-brand-text/60 hover:text-brand-text transition-all cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat Input Dock */}
            <div className="p-4 bg-white border-t border-brand-text/5 flex gap-2 items-center shrink-0">
              <button
                id="mic-speak-btn"
                onClick={handleMicClick}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 border active:scale-90 ${
                  isRecording 
                    ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                    : 'bg-brand-lavender/30 hover:bg-brand-lavender text-[#3C2A3F] border-brand-text/5'
                }`}
                title="Speak to type continuously"
              >
                <Mic className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                id="camera-attach-btn"
                onClick={() => document.getElementById('chat-file-input')?.click()}
                disabled={isAiLoading}
                className="w-10 h-10 rounded-full bg-brand-lavender/30 hover:bg-brand-lavender text-[#3C2A3F] flex items-center justify-center transition-all cursor-pointer shrink-0 border border-brand-text/5 active:scale-90"
                title="Attach photo of meal or ingredients list"
              >
                <Camera className="w-4.5 h-4.5" />
              </button>

              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  disabled={isAiLoading}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  placeholder="Ask companion or scan images..."
                  className="w-full bg-brand-lavender/10 border border-brand-text/10 rounded-full pl-4.5 pr-10 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-text/40 transition-all font-sans disabled:opacity-75"
                />
                <div 
                  className="absolute right-3.5 text-[#A78BFA] animate-pulse"
                  title="Gemini is connected and silently aware of your current cycle day and symptoms."
                >
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <button
                id="send-chat-btn"
                onClick={() => handleSendMessage(inputText)}
                disabled={isAiLoading}
                className="w-10 h-10 rounded-full bg-[#3C2A3F] hover:bg-[#523B56] text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0 active:scale-90 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );

  // Voice synthesis speaker
  function speakText(text: string) {
    if (!isVoiceEnabled) return;
    try {
      window.speechSynthesis.cancel();
      // Clean text of markdown, urls, citations to make it comforting and soft
      const cleaned = text
        .replace(/\*\*?/g, '')
        .replace(/#+/g, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/`[^`]+`/g, '')
        .replace(/\s\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      const soothingVoice = voices.find(v => 
        v.name.includes("Google UK English Female") || 
        v.name.includes("Google US English") || 
        v.name.includes("Zira") ||
        v.name.includes("Female") ||
        v.lang.startsWith("en")
      );
      if (soothingVoice) {
        utterance.voice = soothingVoice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis failed or blocked:", e);
    }
  }

  // Handle image files being selected
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Interrupt any playing voice immediately
    try {
      window.speechSynthesis.cancel();
    } catch (err) {}

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Create an Image object to downscale if necessary
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export as high quality but compressed JPEG to save bandwidth
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            const commaIndex = compressedBase64.indexOf(',');
            const base64 = compressedBase64.substring(commaIndex + 1);
            setSelectedImage({
              base64: base64,
              mimeType: 'image/jpeg',
              name: file.name
            });
          } else {
            // Fallback if canvas fails
            const commaIndex = result.indexOf(',');
            const base64 = result.substring(commaIndex + 1);
            setSelectedImage({
              base64: base64,
              mimeType: file.type,
              name: file.name
            });
          }
        };
        img.onerror = () => {
          // Fallback if image load fails
          const commaIndex = result.indexOf(',');
          const base64 = result.substring(commaIndex + 1);
          setSelectedImage({
            base64: base64,
            mimeType: file.type,
            name: file.name
          });
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  }

  // Chat message send logic powered by server-side Gemini API
  async function handleSendMessage(textToSend: string) {
    if (!textToSend.trim() && !selectedImage) return;
    if (isAiLoading) return;

    // Interrupt any playing voice instantly
    try {
      window.speechSynthesis.cancel();
    } catch (err) {}

    const promptText = textToSend.trim() || "Analyze this image please.";

    // Add user message to state with potential attached image
    const userMsg = { 
      sender: 'user' as const, 
      text: promptText, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsAiLoading(true);

    // Keep payload reference and clear local preview selection
    const attachedImage = selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : undefined;
    setSelectedImage(null);

    // Fetch local user context to bundle invisibly
    const currentLogs = roomDb.getAllLogs();
    const todayLog = currentLogs.find(l => l.date === todayStr);
    const cycleDayStr = `Cycle Day: ${cycleInfo.cycleDay}`;
    const phaseStr = `Phase: ${cycleInfo.phaseName}`;
    const symptomsStr = todayLog && todayLog.symptoms && todayLog.symptoms.length > 0 
      ? todayLog.symptoms.join(', ') 
      : 'None logged yet';
    const moodStr = todayLog && todayLog.mood ? todayLog.mood : 'Not logged yet';
    const flowStr = todayLog && todayLog.flow_intensity ? todayLog.flow_intensity : 'None';
    const notesStr = todayLog && todayLog.notes ? todayLog.notes : '';

    // Deep Conversational Memory & Past Cycle history trends (Upgraded!)
    const allLogsSorted = [...currentLogs].sort((a,b) => b.date.localeCompare(a.date));
    const pastLogsWithSymptoms = allLogsSorted
      .filter(l => l.date !== todayStr)
      .slice(0, 15)
      .map(l => {
        const pastSymptoms = l.symptoms && l.symptoms.length > 0 ? l.symptoms.join(', ') : 'None';
        return `Date: ${l.date} (Symptoms: ${pastSymptoms}${l.notes ? `, Notes: "${l.notes}"` : ''})`;
      })
      .join('\n');

    const dynamicContext = `User Current Context: ${cycleDayStr}, Status: ${phaseStr}, Today's Symptoms: ${symptomsStr}, Mood: ${moodStr}, Flow Intensity: ${flowStr}${notesStr ? `, Daily Notes: "${notesStr}"` : ''}\n\n[DEEP CONVERSATIONAL MEMORY & PAST CYCLE HISTORY TRENDS]\n${pastLogsWithSymptoms || "No historical logs recorded yet."}`;

    try {
      // Reconstruct simple history format (excluding initial message if desired or mapping all)
      const chatHistory = messages.filter(m => m.text !== messages[0].text); // skip welcome msg to keep context clean

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          context: dynamicContext,
          history: chatHistory,
          model: selectedModel,
          searchGrounding: searchGrounding,
          thinkingMode: thinkingMode,
          image: attachedImage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to communicate with the health assistant");
      }

      const data = await response.json();
      
      const botMsg = { 
        sender: 'bot' as const, 
        text: data.reply, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources
      };
      setMessages(prev => [...prev, botMsg]);

      // Automatic text-to-speech auto-read is disabled to keep interaction purely text-based and instantaneous.
      // speakText(data.reply);

      // If symptoms were parsed, perform local log injection and notify metrics
      const parsedSymptoms = parseSymptomsFromInput(promptText);
      if (parsedSymptoms.length > 0) {
        const todayLogEntry = todayLog ? { ...todayLog } : {
          date: todayStr,
          flow_intensity: null,
          symptoms: [] as string[],
          mood: null,
          notes: '',
          medications: [],
          sleep_duration: 8.0
        };
        const existingSymptoms = todayLogEntry.symptoms || [];
        todayLogEntry.symptoms = Array.from(new Set([...existingSymptoms, ...parsedSymptoms]));
        roomDb.saveLog(todayLogEntry);
        if (onDbUpdated) {
          onDbUpdated();
        }
      }

    } catch (error: any) {
      console.error(error);
      const isQuotaError = error.message && (
        error.message.includes("quota") || 
        error.message.includes("limit") || 
        error.message.includes("429") || 
        error.message.includes("RESOURCE_EXHAUSTED")
      );

      const botErrorMsg = {
        sender: 'bot' as const,
        text: isQuotaError 
          ? "⚠️ **Gemini API Quota/Rate Limit Reached:** The current Gemini key has reached its free-tier limits or the model is overloaded. \n\n🌸 *Tip: Try changing the **Intelligence Base** option in the settings above to **⚡ Lite (Fast)** and make sure **Live Web Search** is turned off. These settings use lighter-weight endpoints with much higher quota limits!*"
          : `I encountered an issue connecting to my intelligence base: ${error.message || "Unknown communication issue"}. Please try again shortly or check your connection! 🌸`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botErrorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  }

  function parseSymptomsFromInput(input: string) {
    const textLower = input.toLowerCase();
    const detected: string[] = [];
    if (textLower.includes('headache')) detected.push('headache');
    if (textLower.includes('cramp')) detected.push('cramps');
    if (textLower.includes('bloat')) detected.push('bloating');
    if (textLower.includes('acne') || textLower.includes('pimple')) detected.push('acne');
    if (textLower.includes('tired') || textLower.includes('fatigue') || textLower.includes('exhaust')) detected.push('fatigue');
    if (textLower.includes('mood swing') || textLower.includes('sensitive') || textLower.includes('anxious')) detected.push('mood_swings');
    if (textLower.includes('backache') || textLower.includes('back hurt')) detected.push('backache');
    if (textLower.includes('craving') || textLower.includes('sugar') || textLower.includes('chocolate')) detected.push('cravings');
    return detected;
  }

  function handleMicClick() {
    // Interruption logic: if Speech Synthesis is active, immediately cancel it when voice starts!
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback comfort list if native recognition is not supported inside container iframe
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const randomStatements = [
          "I have a headache and bad cramps today",
          "Feeling incredibly tired and craving sweets",
          "Logged heavy flow and feel bloated today",
          "I had a salad with spinach and pumpkin seeds today",
          "Scanning face wash ingredients list, looking for disruptors"
        ];
        const selectedText = randomStatements[Math.floor(Math.random() * randomStatements.length)];
        setInputText(selectedText);
      }, 1500);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setTranscriptLive('');
        try {
          // Play comforting startup tone
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        } catch (e) {}
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let finalT = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalT += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (finalT) {
          setInputText(prev => prev ? prev.trim() + ' ' + finalT.trim() : finalT.trim());
        }
        setTranscriptLive(interim);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error("Failed starting speech recognition:", e);
      setIsRecording(false);
    }
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Heart, Sparkles, ChevronRight, ArrowLeft, Calendar, Compass } from 'lucide-react';
import { roomDb, formatDate, parseDateString, PeriodLogEntity } from '../db/roomDb';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  // Default last period start date to June 5, 2026 (matching our seeded database timeline)
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-06-05');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save setup values to DB settings
      roomDb.saveSetting('default_cycle_length', String(cycleLength));
      roomDb.saveSetting('default_period_length', String(periodLength));
      roomDb.saveSetting('onboarding_last_period_date', lastPeriodDate);
      roomDb.saveSetting('onboarding_completed', 'true');

      // Generate initial period logs based on the provided last period start date and length
      // This is an incredible quality-of-life feature so their calendar is immediately active!
      try {
        const start = parseDateString(lastPeriodDate);
        const logs: PeriodLogEntity[] = [];

        // Clean out any existing seeded logs first to make it truly customized to their input
        // if they opted to set a specific date
        roomDb.makeDatabaseCompletelyEmpty();
        roomDb.saveSetting('default_cycle_length', String(cycleLength));
        roomDb.saveSetting('default_period_length', String(periodLength));
        roomDb.saveSetting('onboarding_last_period_date', lastPeriodDate);
        roomDb.saveSetting('onboarding_completed', 'true');

        for (let i = 0; i < periodLength; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = formatDate(currentDate);

          // Assign realistic intensities: heavy -> medium -> light -> spotting
          let flow_intensity: PeriodLogEntity['flow_intensity'] = 'medium';
          if (i === 0 || i === 1) flow_intensity = 'heavy';
          else if (i === periodLength - 2) flow_intensity = 'light';
          else if (i === periodLength - 1) flow_intensity = 'spotting';

          // Basic symptoms on day 1 & 2 for realism
          const symptoms = i < 2 ? ['cramps', 'fatigue'] : [];
          const mood = i < 2 ? 'sensitive' : 'calm';

          logs.push({
            date: dateStr,
            flow_intensity,
            symptoms,
            mood,
            notes: i === 0 ? 'Cycle started. Calibrated from onboarding.' : ''
          });
        }

        // Save each generated log
        logs.forEach(log => roomDb.saveLog(log));
      } catch (err) {
        console.error('Error generating onboarding logs:', err);
      }

      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F3EFE6] text-[#3C2A3F] h-full overflow-y-auto select-none">
      
      {/* Top Header & Step Indicator */}
      <div className="flex items-center justify-between pt-4 pb-2 shrink-0">
        {step > 1 ? (
          <motion.button 
            id="onboarding-back-btn"
            onClick={handleBack}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 text-xs font-sans font-bold text-[#3C2A3F]/60 hover:text-[#3C2A3F] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-[#3C2A3F]/40 select-none">
            <Compass className="w-4 h-4 animate-spin-slow" />
            Vesta
          </div>
        )}

        {/* Step dots */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-6 bg-[#3C2A3F]' : 'w-1.5 bg-[#3C2A3F]/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide Container */}
      <div className="flex-1 flex flex-col justify-center my-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 flex flex-col items-center text-center"
            >
              {/* Graphic Element */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#E9E3F5] rounded-full scale-100 animate-pulse opacity-40" />
                <div className="absolute inset-2 bg-[#FCE6D5] rounded-full scale-95 opacity-50" />
                <div className="absolute inset-4 bg-[#F7D9E3] rounded-full scale-90" />
                <Sparkles className="w-10 h-10 text-[#3C2A3F] relative z-10 animate-bounce-slow" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#3C2A3F]/60">
                  WELCOME TO YOUR SANCTUARY
                </span>
                <h1 className="font-serif italic text-3xl font-semibold leading-tight text-[#3C2A3F]">
                  Honoring your body’s natural rhythm
                </h1>
              </div>

              <p className="text-xs text-[#3C2A3F]/70 font-sans leading-relaxed max-w-sm">
                A minimal, eye-safe sanctuary designed to gracefully map your biology. No subscription, no social network integrations, no noise. Just beautiful clarity.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 flex flex-col items-center text-center"
            >
              {/* Privacy Badge Card */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-100 rounded-[32px] rotate-6 opacity-30" />
                <div className="absolute inset-1 bg-[#E9E3F5] rounded-[32px] -rotate-3 opacity-40" />
                <div className="absolute inset-3 bg-[#FDF9F3] border border-[#3C2A3F]/10 rounded-[28px] shadow-sm flex items-center justify-center">
                  <ShieldCheck className="w-12 h-12 text-[#3C2A3F]" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#3C2A3F]/60">
                  100% PRIVATE & OFFLINE
                </span>
                <h1 className="font-serif italic text-3xl font-semibold leading-tight text-[#3C2A3F]">
                  Intimate details remain strictly yours
                </h1>
              </div>

              <div className="space-y-4 max-w-sm">
                <p className="text-xs text-[#3C2A3F]/70 font-sans leading-relaxed">
                  We believe intimate healthcare data is precious. Vesta utilizes a secure <strong>Room + SQLite</strong> local storage structure.
                </p>
                <div className="bg-[#E9E3F5]/30 border border-[#3C2A3F]/5 rounded-2xl p-3 text-left">
                  <p className="text-[10px] text-[#3C2A3F]/80 font-sans leading-relaxed">
                    🔒 <strong>Zero cloud trackers:</strong> Every log, symptom, mood, and note is locked inside your sandboxed device database. Absolutely no leakages.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#3C2A3F]/60 block">
                  CALIBRATE CALCULATIONS
                </span>
                <h1 className="font-serif italic text-2xl font-semibold text-[#3C2A3F]">
                  Tell us about your cycle
                </h1>
                <p className="text-xs text-[#3C2A3F]/60 font-sans">
                  Vesta uses these baselines to initiate future period predictions.
                </p>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 bg-white/70 border border-[#3C2A3F]/10 rounded-[28px] p-5 shadow-sm">
                
                {/* Cycle Length Range Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans font-bold text-[#3C2A3F]/80">Typical Cycle Length</span>
                    <span className="font-mono font-bold text-[#3C2A3F] bg-[#E9E3F5] px-2 py-0.5 rounded-full text-[10px]">
                      {cycleLength} days
                    </span>
                  </div>
                  <input 
                    id="input-cycle-length"
                    type="range"
                    min="21"
                    max="40"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    className="w-full accent-[#3C2A3F] h-1 bg-[#3C2A3F]/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#3C2A3F]/40 font-mono">
                    <span>21d (Short)</span>
                    <span>28d (Average)</span>
                    <span>40d (Long)</span>
                  </div>
                </div>

                {/* Period Length Range Input */}
                <div className="space-y-1.5 border-t border-[#3C2A3F]/5 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans font-bold text-[#3C2A3F]/80">Flow Duration</span>
                    <span className="font-mono font-bold text-[#3C2A3F] bg-[#FCE6D5] px-2 py-0.5 rounded-full text-[10px]">
                      {periodLength} days
                    </span>
                  </div>
                  <input 
                    id="input-period-length"
                    type="range"
                    min="3"
                    max="10"
                    value={periodLength}
                    onChange={(e) => setPeriodLength(Number(e.target.value))}
                    className="w-full accent-[#3C2A3F] h-1 bg-[#3C2A3F]/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#3C2A3F]/40 font-mono">
                    <span>3 days</span>
                    <span>5 days</span>
                    <span>10 days</span>
                  </div>
                </div>

                {/* Last Period Start Date Picker */}
                <div className="space-y-1.5 border-t border-[#3C2A3F]/5 pt-4">
                  <label htmlFor="input-last-period-date" className="block text-xs font-sans font-bold text-[#3C2A3F]/80">
                    When did your last period start?
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3C2A3F]/50 pointer-events-none" />
                    <input 
                      id="input-last-period-date"
                      type="date"
                      value={lastPeriodDate}
                      onChange={(e) => setLastPeriodDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#3C2A3F]/10 rounded-xl text-xs font-sans text-[#3C2A3F] font-semibold focus:outline-none focus:border-[#3C2A3F]/60"
                    />
                  </div>
                  <p className="text-[10px] text-[#3C2A3F]/50 font-sans leading-tight">
                    This allows Vesta to instantly map your history and project your next upcoming flow.
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Footer */}
      <div className="pt-2 pb-4 shrink-0">
        <motion.button
          id="onboarding-next-btn"
          onClick={handleNext}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.01 }}
          className="w-full py-4 bg-[#3C2A3F] hover:bg-[#523B56] text-white rounded-full font-sans font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          {step === 3 ? 'Step into Your Sanctuary' : 'Continue'}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

    </div>
  );
}

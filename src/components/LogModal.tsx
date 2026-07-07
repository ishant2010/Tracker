/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Smile, Activity, Calendar, FileText, Check, Pill, Moon } from 'lucide-react';
import { roomDb, PeriodLogEntity } from '../db/roomDb';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSaved: () => void;
}

const FLOW_INTENSITIES = [
  { id: 'spotting', label: 'Spotting', color: 'bg-brand-lavender hover:bg-brand-lavender/80 text-brand-text border-brand-lavender' },
  { id: 'light', label: 'Light Flow', color: 'bg-brand-pink hover:bg-brand-pink/80 text-brand-text border-brand-pink' },
  { id: 'medium', label: 'Medium Flow', color: 'bg-brand-peach hover:bg-brand-peach/80 text-white border-brand-peach' },
  { id: 'heavy', label: 'Heavy Flow', color: 'bg-[#FCD5D9] hover:bg-[#F9C3C9] text-[#A81E31] border-[#E45B75]' },
];

const SYMPTOMS = [
  { id: 'cramps', label: 'Severe Cramps ⚡' },
  { id: 'headache', label: 'Headache 🧠' },
  { id: 'bloating', label: 'Bloating 🎈' },
  { id: 'acne', label: 'Acne ✨' },
  { id: 'fatigue', label: 'Fatigue 💤' },
  { id: 'mood_swings', label: 'Mood Swings 🎭' },
  { id: 'backache', label: 'Backache 🩹' },
  { id: 'cravings', label: 'Cravings 🍫' },
];

const MOODS = [
  { id: 'happy', label: 'Happy 😊' },
  { id: 'sensitive', label: 'Sensitive 🥺' },
  { id: 'tired', label: 'Tired 🥱' },
  { id: 'anxious', label: 'Anxious 😟' },
  { id: 'calm', label: 'Calm 🧘‍♀️' },
];

const MEDICATIONS = [
  { id: 'vitamins', label: 'Vitamins 💊' },
  { id: 'painkiller', label: 'Painkiller 🩹' },
  { id: 'contraceptive', label: 'Contraceptive 🌸' },
];

export function LogModal({ isOpen, onClose, selectedDate, onSaved }: LogModalProps) {
  const [intensity, setIntensity] = useState<PeriodLogEntity['flow_intensity']>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<PeriodLogEntity['mood']>(null);
  const [notes, setNotes] = useState('');
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [sleepDuration, setSleepDuration] = useState<number>(8.0);

  // Fetch existing data for selectedDate if it exists
  useEffect(() => {
    if (isOpen) {
      const logs = roomDb.getAllLogs();
      const existing = logs.find(l => l.date === selectedDate);
      if (existing) {
        setIntensity(existing.flow_intensity);
        setSelectedSymptoms(existing.symptoms || []);
        setSelectedMood(existing.mood);
        setNotes(existing.notes || '');
        setSelectedMedications(existing.medications || []);
        setSleepDuration(existing.sleep_duration !== undefined ? existing.sleep_duration : 8.0);
      } else {
        // Reset state for new entry
        setIntensity(null);
        setSelectedSymptoms([]);
        setSelectedMood(null);
        setNotes('');
        setSelectedMedications([]);
        setSleepDuration(8.0);
      }
    }
  }, [isOpen, selectedDate]);

  const handleToggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handleToggleMedication = (id: string) => {
    if (selectedMedications.includes(id)) {
      setSelectedMedications(selectedMedications.filter(m => m !== id));
    } else {
      setSelectedMedications([...selectedMedications, id]);
    }
  };

  const handleSave = () => {
    // If all are null/empty, we can treat it as empty or delete
    if (!intensity && selectedSymptoms.length === 0 && !selectedMood && !notes.trim() && selectedMedications.length === 0) {
      roomDb.deleteLog(selectedDate);
    } else {
      const log: PeriodLogEntity = {
        date: selectedDate,
        flow_intensity: intensity,
        symptoms: selectedSymptoms,
        mood: selectedMood,
        notes: notes.trim(),
        medications: selectedMedications,
        sleep_duration: sleepDuration,
      };
      roomDb.saveLog(log);
    }
    onSaved();
    onClose();
  };

  const handleDelete = () => {
    roomDb.deleteLog(selectedDate);
    onSaved();
    onClose();
  };

  // Convert date format from YYYY-MM-DD to a beautiful friendly string like "Monday, June 29"
  const getFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
          />

          {/* Drawer Sheet */}
          <motion.div
            id="log-modal-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 max-h-[85%] bg-brand-bg rounded-t-[32px] border-t border-brand-text/10 shadow-2xl z-50 flex flex-col overflow-hidden transition-colors duration-300"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-brand-text/15 rounded-full mx-auto my-3 shrink-0" />

            {/* Header */}
            <div className="px-6 pb-4 border-b border-brand-text/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-serif italic text-2xl text-brand-text font-semibold transition-colors duration-300">Log Your Day</h3>
                <p className="text-xs text-brand-text/60 font-sans mt-0.5 flex items-center gap-1.5 transition-colors duration-300">
                  <Calendar className="w-3.5 h-3.5" />
                  {getFriendlyDate(selectedDate)}
                </p>
              </div>
              <button
                id="close-modal-btn"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-brand-lavender text-brand-text flex items-center justify-center hover:bg-brand-lavender/85 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              
              {/* Flow Intensity Selection */}
              <div>
                <h4 className="font-serif text-base text-brand-text font-medium mb-3 flex items-center gap-2 transition-colors duration-300">
                  <Activity className="w-4 h-4 text-brand-text/60" />
                  Flow Intensity
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {FLOW_INTENSITIES.map((opt) => {
                    const isSelected = intensity === opt.id;
                    return (
                      <motion.button
                        id={`flow-opt-${opt.id}`}
                        key={opt.id}
                        onClick={() => setIntensity(isSelected ? null : (opt.id as any))}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.01 }}
                        animate={isSelected ? { 
                          scale: [1, 1.03, 1],
                          boxShadow: ["0px 0px 0px rgba(60, 42, 63, 0)", "0px 0px 8px rgba(60, 42, 63, 0.1)", "0px 0px 0px rgba(60, 42, 63, 0)"]
                        } : {}}
                        transition={isSelected ? { 
                          repeat: Infinity, 
                          duration: 2.5, 
                          ease: "easeInOut" 
                        } : { duration: 0.2 }}
                        className={`py-3 px-3 rounded-2xl text-center border font-sans text-sm font-semibold transition-all duration-200 relative overflow-hidden flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${opt.color} border-brand-text/10 shadow-sm`
                            : 'bg-white hover:bg-brand-lavender/40 text-brand-text/80 border-brand-text/10'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Symptoms Checklist */}
              <div>
                <h4 className="font-serif text-base text-brand-text font-medium mb-3 flex items-center gap-2 transition-colors duration-300">
                  <Heart className="w-4 h-4 text-brand-text/60" />
                  How do you feel? (Symptoms)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <motion.button
                        id={`symptom-opt-${sym.id}`}
                        key={sym.id}
                        onClick={() => handleToggleSymptom(sym.id)}
                        whileTap={{ scale: 0.93 }}
                        whileHover={{ scale: 1.03 }}
                        animate={isSelected ? { 
                          scale: [1, 1.04, 1],
                          boxShadow: ["0px 0px 0px rgba(60, 42, 63, 0)", "0px 0px 8px rgba(60, 42, 63, 0.15)", "0px 0px 0px rgba(60, 42, 63, 0)"]
                        } : {}}
                        transition={isSelected ? { 
                          repeat: Infinity, 
                          duration: 2, 
                          ease: "easeInOut" 
                        } : { duration: 0.2 }}
                        className={`px-4 py-2.5 rounded-full border text-xs font-sans font-semibold transition-all duration-150 ${
                          isSelected
                            ? sym.id === 'cramps'
                              ? 'bg-[#FCD5D9] border-[#E45B75] text-[#A81E31] shadow-sm font-bold'
                              : 'bg-brand-pink border-brand-pink text-brand-text shadow-sm font-bold'
                            : 'bg-white hover:bg-brand-lavender/40 text-brand-text/80 border-brand-text/10'
                        }`}
                      >
                        {sym.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Mood Slider/Pills */}
              <div>
                <h4 className="font-serif text-base text-brand-text font-medium mb-3 flex items-center gap-2 transition-colors duration-300">
                  <Smile className="w-4 h-4 text-brand-text/60" />
                  Primary Mood
                </h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {MOODS.map((md) => {
                    const isSelected = selectedMood === md.id;
                    return (
                      <motion.button
                        id={`mood-opt-${md.id}`}
                        key={md.id}
                        onClick={() => setSelectedMood(isSelected ? null : (md.id as any))}
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.02 }}
                        animate={isSelected ? { 
                          scale: [1, 1.04, 1],
                          boxShadow: ["0px 0px 0px rgba(60, 42, 63, 0)", "0px 0px 8px rgba(60, 42, 63, 0.1)", "0px 0px 0px rgba(60, 42, 63, 0)"]
                        } : {}}
                        transition={isSelected ? { 
                          repeat: Infinity, 
                          duration: 2.2, 
                          ease: "easeInOut" 
                        } : { duration: 0.2 }}
                        className={`py-3 px-1.5 rounded-2xl border text-[11px] font-sans font-semibold transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-peach border-brand-peach text-brand-text shadow-sm'
                            : 'bg-white hover:bg-brand-lavender/40 text-brand-text/80 border-brand-text/10'
                        }`}
                      >
                        <span className="text-lg">{md.label.split(' ')[1]}</span>
                        <span className="truncate w-full block">{md.label.split(' ')[0]}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Sleep Duration Slider */}
              <div className="bg-white/50 border border-brand-text/5 rounded-[24px] p-4.5 space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif text-base text-brand-text font-medium flex items-center gap-2 transition-colors duration-300">
                    <Moon className="w-4 h-4 text-brand-text/60" />
                    Sleep Duration
                  </h4>
                  <span className="text-xs font-serif italic font-bold text-brand-text bg-brand-peach/40 px-3 py-1 rounded-full border border-brand-text/5 transition-colors duration-300">
                    {sleepDuration} hrs
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    id="sleep-duration-slider"
                    type="range"
                    min="4"
                    max="12"
                    step="0.5"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(parseFloat(e.target.value))}
                    className="w-full accent-brand-text cursor-pointer bg-brand-text/10 rounded-lg h-2 transition-colors duration-300"
                  />
                  <div className="flex justify-between text-[10px] font-sans font-bold text-brand-text/40 transition-colors duration-300">
                    <span>4 hrs (Minimal)</span>
                    <span className="text-brand-text/60">8 hrs (Ideal)</span>
                    <span>12 hrs (Deep rest)</span>
                  </div>
                </div>
              </div>

              {/* Medication Log Section */}
              <div>
                <h4 className="font-serif text-base text-brand-text font-medium mb-3 flex items-center gap-2 transition-colors duration-300">
                  <Pill className="w-4 h-4 text-brand-text/60" />
                  Medication Log
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {MEDICATIONS.map((med) => {
                    const isSelected = selectedMedications.includes(med.id);
                    return (
                      <motion.button
                        id={`medication-opt-${med.id}`}
                        key={med.id}
                        onClick={() => handleToggleMedication(med.id)}
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.02 }}
                        animate={isSelected ? { 
                          scale: [1, 1.03, 1],
                          boxShadow: ["0px 0px 0px rgba(60, 42, 63, 0)", "0px 0px 8px rgba(60, 42, 63, 0.1)", "0px 0px 0px rgba(60, 42, 63, 0)"]
                        } : {}}
                        transition={isSelected ? { 
                          repeat: Infinity, 
                          duration: 2.4, 
                          ease: "easeInOut" 
                        } : { duration: 0.2 }}
                        className={`py-3 px-2 rounded-2xl text-center border font-sans text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-lavender text-brand-text border-brand-text/10 shadow-sm'
                            : 'bg-white hover:bg-brand-lavender/40 text-brand-text/80 border-brand-text/10'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {med.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Written Notes */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <h4 className="font-serif text-base text-brand-text font-medium mb-3 flex items-center gap-2 transition-colors duration-300">
                  <FileText className="w-4 h-4 text-brand-text/60" />
                  Notes / Diary Entry
                </h4>
                <textarea
                  id="log-notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How is your body feeling today? Jot down any physical changes, cravings, or peaceful moments..."
                  className="w-full h-24 p-3.5 bg-white border border-brand-text/10 rounded-2xl text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-1 focus:ring-brand-text/50 focus:border-brand-text/50 resize-none transition-all"
                />
              </motion.div>

              {/* Completely Private Assurance */}
              <div className="bg-brand-lavender/30 border border-brand-lavender/60 rounded-2xl p-3.5 text-[11px] text-brand-text/85 leading-relaxed flex items-start gap-2.5 transition-colors duration-300">
                <span className="text-base select-none">🔒</span>
                <p>
                  <strong>Private & Completely Offline:</strong> This entry is stored directly in your local device SQLite/Room storage. No servers, trackers, or cookies have access to your intimate healthcare history.
                </p>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-brand-text/10 bg-brand-bg flex gap-3 shrink-0 transition-colors duration-300">
              <motion.button
                id="delete-log-btn"
                onClick={handleDelete}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className="flex-1 py-3.5 rounded-full border border-brand-text/10 text-xs font-sans font-bold text-brand-text/60 hover:bg-brand-lavender/30 transition-all text-center"
              >
                Clear This Day
              </motion.button>
              <motion.button
                id="save-log-btn"
                onClick={handleSave}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className="flex-1 py-3.5 rounded-full bg-brand-text hover:bg-brand-text/90 text-xs font-sans font-bold text-brand-bg shadow-md transition-all text-center"
              >
                Save Daily Entry
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

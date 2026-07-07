/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, HelpCircle, AlertCircle, Plus, Calendar } from 'lucide-react';
import { roomDb, formatDate, parseDateString, PeriodLogEntity } from '../db/roomDb';

interface CalendarScreenProps {
  onOpenLog: (date: string) => void;
  stats: ReturnType<typeof roomDb.calculateStats>;
  todayStr: string; // YYYY-MM-DD
}

export function CalendarScreen({ onOpenLog, stats, todayStr }: CalendarScreenProps) {
  // Store the active viewing year and month
  const today = parseDateString(todayStr);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Months array
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Compute calendar dates for the active month grid
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Previous month filler days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    const grid: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      grid.push({
        dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }

    // Active month days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: true
      });
    }

    // Next month filler days (to make a complete 6-week grid if necessary, or just up to multiples of 7)
    const remainingSlots = 42 - grid.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      grid.push({
        dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Create a fast lookup map for all logged days
  const allLogsMap = useMemo(() => {
    const logs = roomDb.getAllLogs();
    const map: Record<string, PeriodLogEntity> = {};
    logs.forEach(log => {
      map[log.date] = log;
    });
    return map;
  }, [stats]);

  // Create a fast lookup map for our logged flow days
  const loggedFlowMap = useMemo(() => {
    const map: Record<string, PeriodLogEntity> = {};
    for (const key in allLogsMap) {
      const log = allLogsMap[key];
      if (log.flow_intensity !== null) {
        map[log.date] = log;
      }
    }
    return map;
  }, [allLogsMap]);

  // Heuristic-based prediction engine that uses historical cycle data
  // to project the "Predicted Window" for the next 3 months (cycles).
  const isPredictedPeriodDay = (dateStr: string) => {
    const { lastPeriodStartDate, averageCycleLength, averagePeriodLength } = stats;
    if (!lastPeriodStartDate) return false;

    const targetDate = parseDateString(dateStr);
    const lastStart = parseDateString(lastPeriodStartDate);

    // Past days before the last actual logged period start do not get future predictions
    if (targetDate.getTime() < lastStart.getTime()) {
      return false;
    }

    // If already logged, show the actual logged flow instead
    if (loggedFlowMap[dateStr]) {
      return false;
    }

    const diffTime = targetDate.getTime() - lastStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Cycle index: how many cycles away from the last actual period start is the target date
    const cycleIndex = Math.floor(diffDays / averageCycleLength);
    
    // Restrict predictions strictly to the next 3 months/cycles (cycles 1, 2, and 3)
    if (cycleIndex < 1 || cycleIndex > 3) {
      return false;
    }

    const cycleStartOffset = cycleIndex * averageCycleLength;
    const dayInCycle = diffDays - cycleStartOffset;

    // Checks if the target day falls in the predicted period duration window
    return dayInCycle >= 0 && dayInCycle < averagePeriodLength;
  };

  // Predict the ovulation and fertile days for the current user parameters
  const getFertilityStatus = (dateStr: string) => {
    const { lastPeriodStartDate, averageCycleLength } = stats;
    if (!lastPeriodStartDate) return null;

    const targetDate = parseDateString(dateStr);
    const lastStart = parseDateString(lastPeriodStartDate);

    // Past days before the last actual logged period start do not get future predictions
    if (targetDate.getTime() < lastStart.getTime()) {
      return null;
    }

    // Don't show fertility details on logged period days or predicted period days for clarity
    if (loggedFlowMap[dateStr] || isPredictedPeriodDay(dateStr)) {
      return null;
    }

    // Check next 4 cycles to see if this day is fertile or ovulation
    for (let cycleIndex = 0; cycleIndex <= 4; cycleIndex++) {
      const cycleStartOffset = cycleIndex * averageCycleLength;
      const cycleStartDay = new Date(lastStart);
      cycleStartDay.setDate(cycleStartDay.getDate() + cycleStartOffset);

      // Ovulation is roughly 14 days before the start of the next cycle
      const ovulationDay = new Date(cycleStartDay);
      ovulationDay.setDate(ovulationDay.getDate() - 14);

      const diffFromOvulation = Math.round((targetDate.getTime() - ovulationDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffFromOvulation === 0) {
        return 'ovulation';
      }
      if (diffFromOvulation >= -4 && diffFromOvulation < 0) {
        return 'fertile';
      }
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex-1 flex flex-col overflow-y-auto px-6 py-5 space-y-5"
    >
      
      {/* Title block */}
      <div>
        <span className="text-xs uppercase tracking-widest text-[#3C2A3F]/60 font-bold font-sans">
          YOUR CYCLE CALENDAR
        </span>
        <h2 className="font-serif italic text-3xl text-[#3C2A3F] font-semibold mt-0.5">
          Flow Calendar
        </h2>
      </div>

      {/* Calendar Month Control Panel */}
      <div className="bg-[#FDF9F3]/80 border border-[#3C2A3F]/10 rounded-[32px] p-4 shadow-sm flex flex-col">
        <div className="flex justify-between items-center px-2 py-1 mb-4">
          <motion.button
            id="prev-month-btn"
            onClick={handlePrevMonth}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full hover:bg-[#E9E3F5] text-[#3C2A3F] flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          
          <h3 className="font-serif italic text-xl font-bold text-[#3C2A3F]">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          
          <motion.button
            id="next-month-btn"
            onClick={handleNextMonth}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full hover:bg-[#E9E3F5] text-[#3C2A3F] flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 text-center mb-2">
          {WEEK_DAYS.map((day, idx) => (
            <span
              key={idx}
              className={`text-xs font-sans font-bold py-1 ${
                idx === 0 || idx === 6 ? 'text-[#3C2A3F]/40' : 'text-[#3C2A3F]/70'
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1">
          {calendarGrid.map((cell) => {
            const hasLog = loggedFlowMap[cell.dateStr];
            const isPredicted = isPredictedPeriodDay(cell.dateStr);
            const fertilityStatus = getFertilityStatus(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const logDetails = allLogsMap[cell.dateStr];

            let dayStyle = 'text-[#3C2A3F] hover:bg-[#E9E3F5]/40';
            if (!cell.isCurrentMonth) {
              dayStyle = 'text-[#3C2A3F]/30';
            }

            return (
              <motion.button
                id={`cal-cell-${cell.dateStr}`}
                key={cell.dateStr}
                onClick={() => onOpenLog(cell.dateStr)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className={`aspect-square rounded-full flex flex-col items-center justify-center relative text-xs font-semibold transition-all group cursor-pointer ${dayStyle}`}
              >
                {/* Visual Circle Overlays */}
                {hasLog ? (
                  // Logged flow style - Deep plum block
                  <div className="absolute inset-0.5 rounded-full bg-[#3C2A3F] flex items-center justify-center shadow-sm">
                    <span className="text-white font-black">{cell.dayNum}</span>
                    {/* Tiny flow droplet dot indicator */}
                    <span className="absolute bottom-1 w-1 h-1 bg-[#FDF9F3] rounded-full" />
                  </div>
                ) : isPredicted ? (
                  // Predicted soft pink ring with elegant dashed border
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-[#3C2A3F]/30 bg-[#F7D9E3]/40 flex items-center justify-center">
                    <span className="text-[#3C2A3F] font-bold">{cell.dayNum}</span>
                  </div>
                ) : fertilityStatus === 'ovulation' ? (
                  // Ovulation Day - Pastel peach solid circle with a gentle star
                  <div className="absolute inset-0.5 rounded-full bg-[#FCE6D5] flex flex-col items-center justify-center shadow-sm text-[#3C2A3F]">
                    <span className="font-bold">{cell.dayNum}</span>
                    <span className="text-[7.5px] leading-none absolute bottom-1">✨</span>
                  </div>
                ) : fertilityStatus === 'fertile' ? (
                  // Fertile Window - Soft peach border with a light background
                  <div className="absolute inset-0.5 rounded-full border border-[#FCE6D5]/60 bg-[#FCE6D5]/35 flex flex-col items-center justify-center text-[#3C2A3F]">
                    <span className="font-semibold">{cell.dayNum}</span>
                    <span className="text-[6px] leading-none absolute bottom-1 text-[#FCE6D5]/80 font-black">●</span>
                  </div>
                ) : (
                  // Standard day cell
                  <span className={`${isToday ? 'text-[#3C2A3F] font-black underline decoration-[#FCE6D5] decoration-2 underline-offset-4' : ''}`}>
                    {cell.dayNum}
                  </span>
                )}

                {/* Today's subtle outer orange dot/indicator */}
                {isToday && !hasLog && !isPredicted && fertilityStatus !== 'ovulation' && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#FCE6D5] rounded-full" />
                )}

                {/* Non-period symptom dot */}
                {!hasLog && !isPredicted && !fertilityStatus && logDetails && (logDetails.symptoms.length > 0 || logDetails.notes) && (
                  <span className="absolute bottom-1 w-1 h-1 bg-[#3C2A3F]/30 rounded-full" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Calendar Legend Card */}
      <div className="bg-[#FDF9F3]/60 border border-[#3C2A3F]/10 rounded-[28px] p-4.5 space-y-3.5">
        <span className="text-[10px] font-sans font-bold tracking-wider text-[#3C2A3F]/50 block">
          CALENDAR LEGEND & SHORTCUT
        </span>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-[#3C2A3F] inline-block shadow-sm shrink-0" />
            <span className="text-[#3C2A3F]/80 font-sans">Logged Flow</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full border border-dashed border-[#3C2A3F]/30 bg-[#F7D9E3]/40 inline-block shrink-0" />
            <span className="text-[#3C2A3F]/80 font-sans">Predicted Period</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-[#FCE6D5] flex items-center justify-center shadow-sm shrink-0">
              <span className="text-[8px] leading-none mb-0.5">✨</span>
            </span>
            <span className="text-[#3C2A3F]/80 font-sans font-medium">Ovulation Day</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full border border-[#FCE6D5]/60 bg-[#FCE6D5]/35 inline-block shrink-0" />
            <span className="text-[#3C2A3F]/80 font-sans">Fertile Window</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-[#FDF9F3] border border-[#3C2A3F]/15 flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 bg-[#FCE6D5] rounded-full" />
            </span>
            <span className="text-[#3C2A3F]/80 font-sans">Today's Day</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-[#FDF9F3] border border-[#3C2A3F]/15 flex items-center justify-center shrink-0">
              <span className="w-1 h-1 bg-[#3C2A3F]/30 rounded-full" />
            </span>
            <span className="text-[#3C2A3F]/80 font-sans">Symptom Logged</span>
          </div>
        </div>
        <div className="bg-[#E9E3F5]/30 rounded-xl p-3 border border-[#E9E3F5]/60 flex items-start gap-2 text-[11px] text-[#3C2A3F]/80 leading-relaxed">
          <span className="text-[#3C2A3F] text-sm leading-none">💡</span>
          <p>
            <strong>Pro Tip:</strong> Tap on any day in the past to log your period, back-date flow intensity, or edit symptoms. Tap any future day to pre-add notes!
          </p>
        </div>
      </div>

    </motion.div>
  );
}

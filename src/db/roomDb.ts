/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Room & SQLite Virtual Database Engine
// All data is stored locally in the browser's persistent storage, 
// ensuring 100% privacy and full offline functionality.

export interface PeriodLogEntity {
  date: string; // YYYY-MM-DD (Primary Key)
  flow_intensity: 'spotting' | 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  mood: 'happy' | 'sensitive' | 'tired' | 'anxious' | 'calm' | null;
  notes: string;
  medications?: string[]; // Medications logged for this day
  sleep_duration?: number; // Sleep duration in hours
}

export interface UserSettingsEntity {
  key: string; // Primary Key
  value: string;
}

// Log line interface for our virtual SQLite inspection console
export interface SqlConsoleLog {
  timestamp: string;
  statement: string;
  status: 'SUCCESS' | 'ERROR';
  rowsAffected: number;
}

// Default constants in case database is empty and there are no logs
export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

// Let's create helper functions to work with dates
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

class RoomDatabase {
  private logCallbacks: ((log: SqlConsoleLog) => void)[] = [];

  constructor() {
    this.initializeDatabase();
  }

  // Register a callback to update the UI Room SQLite Console in real-time
  public onQueryExecuted(callback: (log: SqlConsoleLog) => void) {
    this.logCallbacks.push(callback);
    return () => {
      this.logCallbacks = this.logCallbacks.filter(cb => cb !== callback);
    };
  }

  private logSql(statement: string, rowsAffected: number = 0, status: 'SUCCESS' | 'ERROR' = 'SUCCESS') {
    const logEntry: SqlConsoleLog = {
      timestamp: new Date().toLocaleTimeString(),
      statement,
      status,
      rowsAffected
    };
    // Save query logs in memory or sessionStorage for developers to inspect
    try {
      const existingLogs = JSON.parse(sessionStorage.getItem('room_sql_logs') || '[]');
      existingLogs.unshift(logEntry);
      sessionStorage.setItem('room_sql_logs', JSON.stringify(existingLogs.slice(0, 50)));
    } catch (e) {
      // Ignored
    }
    // Defer callback execution to prevent updating state during React render cycles
    setTimeout(() => {
      this.logCallbacks.forEach(cb => cb(logEntry));
    }, 0);
  }

  private initializeDatabase() {
    if (!localStorage.getItem('room_initialized')) {
      this.logSql("CREATE TABLE period_logs (date TEXT PRIMARY KEY, flow_intensity TEXT, symptoms TEXT, mood TEXT, notes TEXT);", 1);
      this.logSql("CREATE TABLE user_settings (key TEXT PRIMARY KEY, value TEXT);", 1);
      
      // Pre-seed some realistic historical period logs to demonstrate calculations immediately
      // Let's assume today is June 29, 2026.
      // We will pre-seed three previous cycles to make the app's analytics instantly functional and gorgeous.
      // Cycle 1: April 10 to April 14 (5 days)
      // Cycle 2: May 8 to May 12 (5 days) -- 28 days later
      // Cycle 3: June 5 to June 9 (5 days) -- 28 days later
      const seedLogs: PeriodLogEntity[] = [
        // Cycle 1
        { date: '2026-04-10', flow_intensity: 'heavy', symptoms: ['cramps', 'fatigue'], mood: 'sensitive', notes: 'Cycle started. Feeling very tired.' },
        { date: '2026-04-11', flow_intensity: 'heavy', symptoms: ['cramps', 'headache'], mood: 'tired', notes: 'Heavy flow. Rested today.' },
        { date: '2026-04-12', flow_intensity: 'medium', symptoms: ['bloating'], mood: 'tired', notes: 'Flow is lighter. Cramps are gone.' },
        { date: '2026-04-13', flow_intensity: 'light', symptoms: [], mood: 'calm', notes: 'Almost done. Energy returning.' },
        { date: '2026-04-14', flow_intensity: 'spotting', symptoms: [], mood: 'happy', notes: 'Spotting only. Done!' },

        // Cycle 2
        { date: '2026-05-08', flow_intensity: 'heavy', symptoms: ['cramps', 'headache'], mood: 'sensitive', notes: 'Started early morning. Cramps are back.' },
        { date: '2026-05-09', flow_intensity: 'heavy', symptoms: ['cramps', 'fatigue'], mood: 'tired', notes: 'Slept a lot. Drank ginger tea.' },
        { date: '2026-05-10', flow_intensity: 'medium', symptoms: ['bloating', 'acne'], mood: 'calm', notes: 'Feeling better.' },
        { date: '2026-05-11', flow_intensity: 'light', symptoms: [], mood: 'happy', notes: 'Minimal flow today.' },
        { date: '2026-05-12', flow_intensity: 'spotting', symptoms: [], mood: 'happy', notes: 'Completed.' },

        // Cycle 3
        { date: '2026-06-05', flow_intensity: 'heavy', symptoms: ['cramps'], mood: 'sensitive', notes: 'Period started right on schedule!' },
        { date: '2026-06-06', flow_intensity: 'heavy', symptoms: ['cramps', 'fatigue'], mood: 'tired', notes: 'Warm hot water bottle helped.' },
        { date: '2026-06-07', flow_intensity: 'medium', symptoms: ['bloating'], mood: 'calm', notes: 'Feeling creative today.' },
        { date: '2026-06-08', flow_intensity: 'light', symptoms: [], mood: 'happy', notes: 'Light walks.' },
        { date: '2026-06-09', flow_intensity: 'spotting', symptoms: [], mood: 'happy', notes: 'All clear.' }
      ];

      localStorage.setItem('room_period_logs', JSON.stringify(seedLogs));
      
      const seedSettings: UserSettingsEntity[] = [
        { key: 'default_cycle_length', value: '28' },
        { key: 'default_period_length', value: '5' }
      ];
      localStorage.setItem('room_user_settings', JSON.stringify(seedSettings));
      localStorage.setItem('room_initialized', 'true');

      this.logSql("INSERT INTO period_logs (date, flow_intensity, ...) VALUES (15 seeded records);", 15);
      this.logSql("INSERT INTO user_settings (key, value) VALUES (2 records);", 2);
    }
  }

  // Get all logs sorted by date
  public getAllLogs(): PeriodLogEntity[] {
    try {
      let logs = JSON.parse(localStorage.getItem('room_period_logs') || '[]');
      let updated = false;
      logs = logs.map((log: any) => {
        if (log.sleep_duration === undefined) {
          // Generate realistic default sleep duration based on the mood or flow to look realistic!
          let sleep = 7.5;
          if (log.mood === 'tired' || log.flow_intensity === 'heavy') {
            // Seed cycles with slightly lower sleep or extra rest
            sleep = 5.5 + Math.sin(new Date(log.date).getDate()) * 1.5;
          } else if (log.mood === 'happy') {
            sleep = 8.0 + Math.cos(new Date(log.date).getDate()) * 0.5;
          } else {
            sleep = 7.0 + Math.sin(new Date(log.date).getDate()) * 1.0;
          }
          // Clamp to 4 to 12 range and round to nearest 0.5 hours
          log.sleep_duration = Math.round(Math.max(4, Math.min(12, sleep)) * 2) / 2;
          updated = true;
        }
        return log;
      });
      if (updated) {
        localStorage.setItem('room_period_logs', JSON.stringify(logs));
      }
      this.logSql("SELECT * FROM period_logs ORDER BY date ASC;", logs.length);
      return logs.sort((a: PeriodLogEntity, b: PeriodLogEntity) => a.date.localeCompare(b.date));
    } catch (e) {
      this.logSql("SELECT * FROM period_logs ORDER BY date ASC;", 0, 'ERROR');
      return [];
    }
  }

  // Save or update a log
  public saveLog(log: PeriodLogEntity): void {
    try {
      const logs = this.getAllLogs();
      const existingIndex = logs.findIndex(l => l.date === log.date);
      
      if (existingIndex >= 0) {
        logs[existingIndex] = log;
        this.logSql(`UPDATE period_logs SET flow_intensity='${log.flow_intensity}', symptoms=ARRAY, mood='${log.mood}', notes='${log.notes.replace(/'/g, "''")}' WHERE date='${log.date}';`, 1);
      } else {
        logs.push(log);
        this.logSql(`INSERT INTO period_logs (date, flow_intensity, symptoms, mood, notes) VALUES ('${log.date}', '${log.flow_intensity}', ARRAY, '${log.mood}', '${log.notes.replace(/'/g, "''")}');`, 1);
      }

      localStorage.setItem('room_period_logs', JSON.stringify(logs));
    } catch (e) {
      this.logSql(`INSERT/UPDATE period_logs FAILED;`, 0, 'ERROR');
    }
  }

  // Delete a log
  public deleteLog(date: string): void {
    try {
      const logs = this.getAllLogs();
      const filtered = logs.filter(l => l.date !== date);
      localStorage.setItem('room_period_logs', JSON.stringify(filtered));
      this.logSql(`DELETE FROM period_logs WHERE date='${date}';`, logs.length - filtered.length);
    } catch (e) {
      this.logSql(`DELETE FROM period_logs WHERE date='${date}' FAILED;`, 0, 'ERROR');
    }
  }

  // Get all user settings
  public getUserSettings(): UserSettingsEntity[] {
    try {
      const settings = JSON.parse(localStorage.getItem('room_user_settings') || '[]');
      return settings;
    } catch (e) {
      return [];
    }
  }

  // Get specific user setting
  public getSetting(key: string, defaultValue: string = ''): string {
    const settings = this.getUserSettings();
    const found = settings.find(s => s.key === key);
    return found ? found.value : defaultValue;
  }

  // Save or update user setting
  public saveSetting(key: string, value: string): void {
    try {
      const settings = this.getUserSettings();
      const existingIndex = settings.findIndex(s => s.key === key);
      if (existingIndex >= 0) {
        settings[existingIndex].value = value;
        this.logSql(`UPDATE user_settings SET value='${value}' WHERE key='${key}';`, 1);
      } else {
        settings.push({ key, value });
        this.logSql(`INSERT INTO user_settings (key, value) VALUES ('${key}', '${value}');`, 1);
      }
      localStorage.setItem('room_user_settings', JSON.stringify(settings));
    } catch (e) {
      this.logSql(`INSERT/UPDATE user_settings FAILED;`, 0, 'ERROR');
    }
  }

  // Reset database (wipe logs or restore default seeded data)
  public clearDatabase(): void {
    localStorage.removeItem('room_initialized');
    localStorage.removeItem('room_period_logs');
    localStorage.removeItem('room_user_settings');
    this.logSql("DROP TABLE period_logs; DROP TABLE user_settings;", 1);
    this.initializeDatabase();
  }

  // Reset database to completely empty state (no seed logs)
  public makeDatabaseCompletelyEmpty(): void {
    localStorage.setItem('room_initialized', 'true');
    localStorage.setItem('room_period_logs', JSON.stringify([]));
    localStorage.setItem('room_user_settings', JSON.stringify([
      { key: 'default_cycle_length', value: '28' },
      { key: 'default_period_length', value: '5' }
    ]));
    this.logSql("DELETE FROM period_logs; -- Database is now completely empty", 0);
  }

  // Get virtual console logs
  public getSqlConsoleLogs(): SqlConsoleLog[] {
    try {
      return JSON.parse(sessionStorage.getItem('room_sql_logs') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * --- MENSTRUAL CYCLE CALCULATIONS ENGINE ---
   * 
   * A period segment is a group of consecutive or near-consecutive logged days.
   * We consider days logged with flow_intensity != null.
   * If two logged days are within 2 days of each other, they belong to the same period.
   */
  public calculateStats() {
    const logs = this.getAllLogs();
    const configCycleLength = Number(this.getSetting('default_cycle_length', String(DEFAULT_CYCLE_LENGTH)));
    const configPeriodLength = Number(this.getSetting('default_period_length', String(DEFAULT_PERIOD_LENGTH)));
    
    // Filter out entries that have a active flow
    const flowLogs = logs.filter(l => l.flow_intensity !== null);
    
    if (flowLogs.length === 0) {
      const onboardingLastDate = this.getSetting('onboarding_last_period_date', '');
      let nextPredictedDate: string | null = null;
      if (onboardingLastDate) {
        const lastStart = parseDateString(onboardingLastDate);
        const predicted = new Date(lastStart);
        predicted.setDate(predicted.getDate() + Math.round(configCycleLength));
        nextPredictedDate = formatDate(predicted);
      }

      return {
        averageCycleLength: configCycleLength,
        averagePeriodLength: configPeriodLength,
        lastPeriodStartDate: onboardingLastDate || null,
        nextPredictedDate: nextPredictedDate,
        isCustom: onboardingLastDate ? true : false,
        periodGroups: []
      };
    }

    // Sort flow logs chronologically
    const sortedFlowDates = flowLogs
      .map(l => l.date)
      .sort((a, b) => a.localeCompare(b));

    // Group dates into periods (if logs are separated by <= 2 days, they belong to the same flow)
    const periodGroups: { startDate: string; endDate: string; duration: number }[] = [];
    
    if (sortedFlowDates.length > 0) {
      let currentGroup: string[] = [sortedFlowDates[0]];
      
      for (let i = 1; i < sortedFlowDates.length; i++) {
        const prevDate = parseDateString(sortedFlowDates[i - 1]);
        const currDate = parseDateString(sortedFlowDates[i]);
        
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 2) {
          // Part of the same period flow
          currentGroup.push(sortedFlowDates[i]);
        } else {
          // Save finished group and start new one
          const sDate = currentGroup[0];
          const eDate = currentGroup[currentGroup.length - 1];
          const dur = Math.round((parseDateString(eDate).getTime() - parseDateString(sDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
          periodGroups.push({ startDate: sDate, endDate: eDate, duration: dur });
          currentGroup = [sortedFlowDates[i]];
        }
      }
      
      // Push the last group
      if (currentGroup.length > 0) {
        const sDate = currentGroup[0];
        const eDate = currentGroup[currentGroup.length - 1];
        const dur = Math.round((parseDateString(eDate).getTime() - parseDateString(sDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        periodGroups.push({ startDate: sDate, endDate: eDate, duration: dur });
      }
    }

    // 1. Calculate Average Period Length (flow duration)
    let avgPeriodLength = configPeriodLength;
    if (periodGroups.length > 0) {
      const sumDurations = periodGroups.reduce((sum, g) => sum + g.duration, 0);
      avgPeriodLength = Math.round((sumDurations / periodGroups.length) * 10) / 10;
    }

    // 2. Calculate Average Cycle Length (start of one period to the start of the next)
    let avgCycleLength = configCycleLength;
    if (periodGroups.length >= 2) {
      let totalCycleDays = 0;
      let cycleCount = 0;
      
      for (let i = 1; i < periodGroups.length; i++) {
        const startPrev = parseDateString(periodGroups[i - 1].startDate);
        const startCurr = parseDateString(periodGroups[i].startDate);
        const diffTime = startCurr.getTime() - startPrev.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Sanity check: cycles should be reasonable (e.g., between 15 and 45 days)
        if (diffDays >= 15 && diffDays <= 45) {
          totalCycleDays += diffDays;
          cycleCount++;
        }
      }
      
      if (cycleCount > 0) {
        avgCycleLength = Math.round(totalCycleDays / cycleCount);
      }
    }

    // 3. Last Period Start Date
    const lastPeriodGroup = periodGroups[periodGroups.length - 1];
    const lastPeriodStartDate = lastPeriodGroup ? lastPeriodGroup.startDate : null;

    // 4. Predict Next Start Date
    let nextPredictedDate: string | null = null;
    if (lastPeriodStartDate) {
      const lastStart = parseDateString(lastPeriodStartDate);
      const predicted = new Date(lastStart);
      predicted.setDate(predicted.getDate() + Math.round(avgCycleLength));
      nextPredictedDate = formatDate(predicted);
    }

    return {
      averageCycleLength: avgCycleLength,
      averagePeriodLength: avgPeriodLength,
      lastPeriodStartDate,
      nextPredictedDate,
      isCustom: true,
      periodGroups
    };
  }
}

export const roomDb = new RoomDatabase();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { roomDb, PeriodLogEntity, UserSettingsEntity } from './roomDb';

export interface SyncResult {
  success: boolean;
  message: string;
}

/**
 * Pushes the local Room DB state directly to Firebase Firestore
 */
export async function pushLocalToFirebase(uid: string): Promise<SyncResult> {
  try {
    const logs = roomDb.getAllLogs();
    const settings = roomDb.getUserSettings();

    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      period_logs: logs,
      user_settings: settings,
      syncedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, message: 'Local data pushed to cloud vault successfully. 🌸' };
  } catch (error: any) {
    console.error('Firebase Cloud Sync Push Error:', error);
    return { success: false, message: error.message || 'Failed to sync data to the cloud.' };
  }
}

/**
 * Performs a bidirectional sync:
 * 1. Reads remote Firestore data
 * 2. Merges it with local data (combining both sets of logs/settings, prioritizing local for exact duplicates)
 * 3. Saves merged data to both localStorage and Firestore
 */
export async function syncBidirectional(uid: string): Promise<SyncResult> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    const localLogs = roomDb.getAllLogs();
    const localSettings = roomDb.getUserSettings();

    if (!docSnap.exists()) {
      // No cloud data yet, perform a full push
      return await pushLocalToFirebase(uid);
    }

    const remoteData = docSnap.data();
    const remoteLogs: PeriodLogEntity[] = remoteData.period_logs || [];
    const remoteSettings: UserSettingsEntity[] = remoteData.user_settings || [];

    // --- Merge Period Logs ---
    const mergedLogsMap = new Map<string, PeriodLogEntity>();

    // Add remote logs first
    for (const log of remoteLogs) {
      if (log && log.date) {
        mergedLogsMap.set(log.date, log);
      }
    }

    // Add local logs (overwrites remote if duplicates exist, since active session is master)
    for (const log of localLogs) {
      if (log && log.date) {
        mergedLogsMap.set(log.date, log);
      }
    }

    const finalLogs = Array.from(mergedLogsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // --- Merge Settings ---
    const mergedSettingsMap = new Map<string, string>();

    // Add remote settings
    for (const s of remoteSettings) {
      if (s && s.key) {
        mergedSettingsMap.set(s.key, s.value);
      }
    }

    // Add local settings (overwrites remote)
    for (const s of localSettings) {
      if (s && s.key) {
        mergedSettingsMap.set(s.key, s.value);
      }
    }

    const finalSettings = Array.from(mergedSettingsMap.entries()).map(([key, value]) => ({
      key,
      value
    }));

    // Update localStorage
    localStorage.setItem('room_period_logs', JSON.stringify(finalLogs));
    localStorage.setItem('room_user_settings', JSON.stringify(finalSettings));

    // Update Firestore to make sure both sides are fully synchronized
    await setDoc(userDocRef, {
      period_logs: finalLogs,
      user_settings: finalSettings,
      syncedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, message: 'Cloud database merged and synchronized perfectly. 🌸' };
  } catch (error: any) {
    console.error('Firebase Bidirectional Sync Error:', error);
    return { success: false, message: error.message || 'Failed to synchronize cloud data.' };
  }
}

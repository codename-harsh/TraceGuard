/**
 * useExtension.ts — React hooks for communicating with the background service worker
 */

import { useCallback, useEffect, useState } from 'react';
import type { ExtensionMessage, ExtensionResponse, ExtensionSettings, TabScanState } from '../types/extension-types';

// ---------------------------------------------------------------------------
// Send message helper
// ---------------------------------------------------------------------------

async function sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: ExtensionResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message ?? 'Extension error' });
        } else {
          resolve(response ?? { ok: false, error: 'No response from background.' });
        }
      });
    } catch (err) {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

// ---------------------------------------------------------------------------
// Active tab helper
// ---------------------------------------------------------------------------

async function getActiveTabId(): Promise<number | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook: useTabScan
// ---------------------------------------------------------------------------

interface UseTabScanReturn {
  tabId: number | null;
  state: TabScanState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  rescan: () => Promise<void>;
  saveScan: () => Promise<string>;
}

export function useTabScan(): UseTabScanReturn {
  const [tabId, setTabId] = useState<number | null>(null);
  const [state, setState] = useState<TabScanState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async (tid: number) => {
    setLoading(true);
    const resp = await sendMessage({ type: 'GET_CURRENT_SCAN', tabId: tid });
    if (resp.ok && 'data' in resp) {
      setState(resp.data as TabScanState);
      setError(null);
    } else if (!resp.ok) {
      setError(resp.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    getActiveTabId().then((tid) => {
      if (tid !== null) {
        setTabId(tid);
        void fetchState(tid);

        // Poll while scanning
        interval = setInterval(async () => {
          const resp = await sendMessage({ type: 'GET_CURRENT_SCAN', tabId: tid });
          if (resp.ok && 'data' in resp) {
            const s = resp.data as TabScanState;
            setState(s);
            if (s.status !== 'scanning') {
              clearInterval(interval);
              setLoading(false);
            }
          }
        }, 800);
      } else {
        setLoading(false);
      }
    });

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    if (tabId !== null) await fetchState(tabId);
  }, [tabId, fetchState]);

  const rescan = useCallback(async () => {
    if (tabId === null) return;
    setState((prev) => prev ? { ...prev, status: 'scanning' } : null);
    setLoading(true);
    await sendMessage({ type: 'RESCAN_TAB', tabId });
    // Poll for completion
    const interval = setInterval(async () => {
      const resp = await sendMessage({ type: 'GET_CURRENT_SCAN', tabId });
      if (resp.ok && 'data' in resp) {
        const s = resp.data as TabScanState;
        setState(s);
        if (s.status !== 'scanning') {
          clearInterval(interval);
          setLoading(false);
        }
      }
    }, 800);
  }, [tabId]);

  const saveScan = useCallback(async (): Promise<string> => {
    if (tabId === null) throw new Error('No active tab.');
    const resp = await sendMessage({ type: 'SAVE_SCAN_TO_BACKEND', tabId });
    if (!resp.ok) throw new Error(resp.error);
    return (resp as { ok: true; message: string }).message;
  }, [tabId]);

  return { tabId, state, loading, error, refresh, rescan, saveScan };
}

// ---------------------------------------------------------------------------
// Hook: useSettings
// ---------------------------------------------------------------------------

interface UseSettingsReturn {
  settings: ExtensionSettings | null;
  loading: boolean;
  update: (patch: Partial<ExtensionSettings>) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage({ type: 'GET_SETTINGS' }).then((resp) => {
      if (resp.ok && 'data' in resp) setSettings(resp.data as ExtensionSettings);
      setLoading(false);
    });
  }, []);

  const update = useCallback(async (patch: Partial<ExtensionSettings>) => {
    await sendMessage({ type: 'UPDATE_SETTINGS', settings: patch });
    setSettings((prev) => prev ? { ...prev, ...patch } : null);
  }, []);

  return { settings, loading, update };
}

// ---------------------------------------------------------------------------
// Clear scan cache helper
// ---------------------------------------------------------------------------

export async function clearScanCache(): Promise<string> {
  const resp = await sendMessage({ type: 'CLEAR_SCAN_CACHE' });
  if (!resp.ok) throw new Error(resp.error);
  return (resp as { ok: true; message: string }).message;
}

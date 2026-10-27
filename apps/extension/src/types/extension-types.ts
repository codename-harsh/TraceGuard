/**
 * extension-types.ts
 *
 * Extension-internal types for message passing, storage, and settings.
 * These supplement @traceguard/shared-types with Chrome extension specifics.
 */

import type { WebsiteScanPayload } from '@traceguard/shared-types';

// ---------------------------------------------------------------------------
// Extension Settings
// ---------------------------------------------------------------------------

export interface ExtensionSettings {
  /** Base URL of the TraceGuard backend API */
  apiBaseUrl: string;
  /** Bearer token for authenticated scan saving (empty = not authenticated) */
  apiToken: string;
  /** Whether to automatically scan on page load */
  autoScan: boolean;
  /** Whether the extension is enabled globally */
  enabled: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  apiToken: '',
  autoScan: true,
  enabled: true,
};

// ---------------------------------------------------------------------------
// Per-tab scan state stored in chrome.storage.local
// ---------------------------------------------------------------------------

export type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export interface TabScanState {
  tabId: number;
  status: ScanStatus;
  /** ISO-8601 timestamp of most recent scan start */
  scannedAt: string | null;
  /** The complete scan payload (populated when status === 'complete') */
  payload: WebsiteScanPayload | null;
  /** Error message (populated when status === 'error') */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Message types (extension → popup / popup → background)
// ---------------------------------------------------------------------------

export type ExtensionMessage =
  | { type: 'GET_CURRENT_SCAN'; tabId: number }
  | { type: 'RESCAN_TAB'; tabId: number }
  | { type: 'SAVE_SCAN_TO_BACKEND'; tabId: number }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ExtensionSettings> }
  | { type: 'CLEAR_SCAN_CACHE' }
  | { type: 'CONTENT_INDICATORS'; tabId: number; data: ContentIndicators };

export type ExtensionResponse =
  | { ok: true; data: TabScanState }
  | { ok: true; data: ExtensionSettings }
  | { ok: true; message: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Content script indicators (DOM-observable, no values)
// ---------------------------------------------------------------------------

export interface PermissionState {
  name: 'geolocation' | 'notifications' | 'camera' | 'microphone' | 'clipboard-read';
  state: 'granted' | 'prompt' | 'denied' | 'unknown';
}

export interface ContentIndicators {
  /** Number of localStorage keys (never values) */
  localStorageLength: number;
  /** Approximate total byte footprint of localStorage keys (names only) */
  localStorageKeyBytes: number;
  /** Number of sessionStorage keys (never values) */
  sessionStorageLength: number;
  /** Approximate total byte footprint of sessionStorage keys (names only) */
  sessionStorageKeyBytes: number;
  /** Whether the page is loaded over HTTPS */
  isHttps: boolean;
  /** Whether mixed content subresources were detected in the DOM */
  hasMixedContent: boolean;
  /** Observable browser permission states */
  permissions: PermissionState[];
}

/**
 * content/index.ts — TraceGuard Minimal Content Script
 *
 * Runs at document_idle in the page context. Collects ONLY metadata —
 * NEVER reads cookie values, localStorage values, sessionStorage values,
 * or any user content.
 *
 * Observables collected:
 *   - localStorage.length + key name byte footprint
 *   - sessionStorage.length + key name byte footprint
 *   - HTTPS protocol status
 *   - Mixed-content DOM indicators (img/script/link src over HTTP)
 *   - Browser permission states (geolocation, notifications, camera,
 *     microphone, clipboard-read) mapped to granted/prompt/denied/unknown
 *
 * After collection, sends a CONTENT_INDICATORS message to the background
 * service worker.
 */

import type { ContentIndicators, PermissionState } from '../types/extension-types';

// ---------------------------------------------------------------------------
// Storage metadata (key names only — never values)
// ---------------------------------------------------------------------------

function collectStorageMeta(storage: Storage): { length: number; keyBytes: number } {
  const length = storage.length;
  let keyBytes = 0;
  try {
    for (let i = 0; i < length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        keyBytes += key.length * 2; // UTF-16 approximation
      }
    }
  } catch {
    // Storage may throw in some sandboxed contexts — safe to ignore
  }
  return { length, keyBytes };
}

// ---------------------------------------------------------------------------
// Mixed-content detection (DOM observation only)
// ---------------------------------------------------------------------------

function detectMixedContent(): boolean {
  // Check for HTTP URLs in resource-bearing elements
  const selectors = [
    'img[src]',
    'script[src]',
    'link[href]',
    'iframe[src]',
    'video[src]',
    'audio[src]',
  ];

  for (const sel of selectors) {
    const elements = document.querySelectorAll(sel);
    for (const el of Array.from(elements)) {
      const src =
        el.getAttribute('src') ||
        el.getAttribute('href') ||
        '';
      if (src.startsWith('http://')) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Permission states
// ---------------------------------------------------------------------------

async function collectPermissions(): Promise<PermissionState[]> {
  const names: PermissionState['name'][] = [
    'geolocation',
    'notifications',
    'camera',
    'microphone',
    'clipboard-read',
  ];

  const results: PermissionState[] = [];

  for (const name of names) {
    try {
      const status = await navigator.permissions.query({
        name: name as PermissionName,
      });
      results.push({ name, state: status.state as PermissionState['state'] });
    } catch {
      results.push({ name, state: 'unknown' });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main collection and message dispatch
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  let localStorageLength = 0;
  let localStorageKeyBytes = 0;
  let sessionStorageLength = 0;
  let sessionStorageKeyBytes = 0;

  try {
    const ls = collectStorageMeta(window.localStorage);
    localStorageLength = ls.length;
    localStorageKeyBytes = ls.keyBytes;
  } catch {
    // Storage blocked (e.g. cross-origin iframe) — leave defaults
  }

  try {
    const ss = collectStorageMeta(window.sessionStorage);
    sessionStorageLength = ss.length;
    sessionStorageKeyBytes = ss.keyBytes;
  } catch {
    // Storage blocked — leave defaults
  }

  const isHttps = window.location.protocol === 'https:';
  const hasMixedContent = isHttps ? detectMixedContent() : false;
  const permissions = await collectPermissions();

  const indicators: ContentIndicators = {
    localStorageLength,
    localStorageKeyBytes,
    sessionStorageLength,
    sessionStorageKeyBytes,
    isHttps,
    hasMixedContent,
    permissions,
  };

  try {
    // Send to background service worker
    chrome.runtime.sendMessage({
      type: 'CONTENT_INDICATORS',
      tabId: -1, // background resolves real tabId from sender
      data: indicators,
    });
  } catch {
    // Extension context may be invalidated during navigation — safe to ignore
  }
}

// Only run on http/https pages, not extension or chrome:// pages
if (
  window.location.protocol === 'http:' ||
  window.location.protocol === 'https:'
) {
  void run();
}

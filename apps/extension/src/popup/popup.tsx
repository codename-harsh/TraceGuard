/**
 * popup/popup.tsx — TraceGuard Extension Popup Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { PopupApp } from './PopupApp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>,
  );
}

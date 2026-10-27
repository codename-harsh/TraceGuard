/**
 * options/options.tsx — TraceGuard Extension Options Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { OptionsApp } from './OptionsApp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <OptionsApp />
    </React.StrictMode>,
  );
}

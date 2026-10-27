/**
 * fullview/fullview.tsx — Full Analysis Page Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { FullViewApp } from './FullViewApp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <FullViewApp />
    </React.StrictMode>,
  );
}

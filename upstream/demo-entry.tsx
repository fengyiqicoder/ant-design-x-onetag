// Mounts the exact demo file proposed for ant-design/x (upstream/files/onetag.tsx).
// The build swaps its placeholder key for the page key; see scripts/build-site.sh.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './files/onetag';

createRoot(document.getElementById('root')!).render(<App />);

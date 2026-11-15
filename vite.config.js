import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const proxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:4000',
    changeOrigin: true,
  },
};

// Bibliotekų grupės atskiriems gabalams. Tik čia išvardytos bibliotekos patenka į
// „vendor-*“ gabalus; likusios lieka su jas naudojančiu kodu, kad pradinis paketas
// nepriklausytų nuo diagramų, kalendoriaus ar PDF gabalų.
const VENDOR_GROUPS = [
  [
    'vendor-react',
    /^(react|react-dom|react-is|scheduler|react-router|react-router-dom|@babel\/runtime|clsx)$/,
  ],
  [
    'vendor-charts',
    /^(recharts|d3-[a-z-]+|victory-vendor|internmap|@reduxjs\/toolkit|react-redux|redux|redux-thunk|immer|reselect|es-toolkit|eventemitter3|decimal\.js-light|tiny-invariant|use-sync-external-store)$/,
  ],
  [
    'vendor-calendar',
    /^(react-big-calendar|date-fns|date-arithmetic|dayjs|luxon|moment|@popperjs\/core|dom-helpers|react-overlays|@restart\/hooks|uncontrollable|prop-types|invariant|warning|lodash|memoize-one|react-lifecycles-compat)$/,
  ],
  ['vendor-pdf', /^(jspdf|fflate|core-js)$/],
  ['vendor-forms', /^(react-hook-form|zod|@hookform\/resolvers)$/],
];

/** Grąžina gabalo pavadinimą pagal modulio kelią node_modules kataloge arba undefined. */
function vendorChunk(id) {
  // Vite tingaus įkėlimo pagalbinis modulis naudojamas visų gabalų – laikomas bazėje
  if (id.includes('vite/preload-helper')) return 'vendor-react';
  const normalized = id.replaceAll('\\', '/'); // Windows keliai
  const marker = normalized.lastIndexOf('node_modules/');
  if (marker === -1) return undefined;
  const parts = normalized.slice(marker + 'node_modules/'.length).split('/');
  const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  const group = VENDOR_GROUPS.find(([, pattern]) => pattern.test(name));
  return group ? group[0] : undefined;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { proxy },
  preview: { proxy },
  build: {
    // Kodo skaidymas: didelės bibliotekos į atskirus gabalus (chunk), kad viešų puslapių
    // pradinis paketas neatsisiųstų diagramų, PDF ir kalendoriaus kodo. Rolių zonos
    // papildomai kraunamos tingiai (React.lazy) — žr. src/App.jsx.
    rollupOptions: {
      output: {
        manualChunks: (id) => vendorChunk(id),
      },
    },
  },
});

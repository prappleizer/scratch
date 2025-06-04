import { create } from 'zustand';

import { readFile } from 'jsfits'; // your custom FITS parser package
import { convertFloat32ToUint16 } from './wasm/convert'; // your WASM module


function computeStats(data, lowPercentile = 1, highPercentile = 99.9) {
  const sorted = Float32Array.from(data).sort();
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const pLow = sorted[Math.floor((lowPercentile / 100) * n)];
  const pHigh = sorted[Math.floor((highPercentile / 100) * n)];
  return {
    rawMin: min - 0.1 * Math.abs(min),
    rawMax: max + 0.1 * Math.abs(max),
    autoBlackPoint: pLow,
    autoWhitePoint: pHigh,
  };
}


const useFitsStore = create((set, get) => ({
  // File-level metadata
  file: {
    name: null,
    header: null,
    headerText: '',
  },

  // Image data and metadata
  image: {
    data: null,
    halfFloatData: null,
    width: 0,
    height: 0,
    stats: null,
    wcs: null,
  },

  // Display settings
  display: {
    black: 0.2,
    white: 0.8,
    colormap: 'greys',
    reverse: false,
    scaleMode: 0, // Add this
  },

  // Status flags
  status: {
    isLoading: false,
    error: null,
  },

  // Load a FITS file and extract everything
  loadFits: async (file) => {
    set((state) => ({
      status: { ...state.status, isLoading: true, error: null },
    }));

    try {
      const buffer = await file.arrayBuffer();
      const result = await readFile(buffer, { createWCS: true });
      const { header, headerText, data, width, height, wcs } = result.primaryHDU;

      const stats = computeStats(data);
      const range = stats.rawMax - stats.rawMin;
      const normalized = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        normalized[i] = (data[i] - stats.rawMin) / range;
      }

      const halfFloatData = await convertFloat32ToUint16(normalized);
      const currentDisplay = get().display;

      set({
        file: { name: file.name, header, headerText },
        image: { data, halfFloatData, width, height, stats, wcs },
        display: {
          black: stats.autoBlackPoint,
          white: stats.autoWhitePoint,
          colormap: currentDisplay.colormap,
          reverse: currentDisplay.reverse,
          scaleMode: currentDisplay.scaleMode,
        },
        status: { isLoading: false, error: null },
      });
    } catch (err) {
      console.error("Failed to load FITS:", err);
      set((state) => ({
        status: { ...state.status, isLoading: false, error: String(err) },
      }));
    }
  },

  updateBlackWhite: (black, white) => {
    set((state) => ({
      display: { ...state.display, black, white },
    }));
  },

  setColormap: (colormap, reverse = get().display.reverse) => {
    set((state) => ({
      display: { ...state.display, colormap, reverse },
    }));
  },
  setScaleMode: (mode) => {
    set((state) => ({
      display: { ...state.display, scaleMode: mode },
    }));
  },
}));

export default useFitsStore;
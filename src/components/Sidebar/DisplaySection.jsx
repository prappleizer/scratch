// DisplaySection.jsx
import React from 'react';
import useFitsStore from '../../fitsStore';
import { useImageTransform } from '../../contexts/ImageTransformContext';
import DropdownWrapper from './DropdownWrapper';

const scaleLabels = ['Linear', 'Sqrt', 'Log', 'Asinh'];

export default function DisplaySection() {
  const { image, display, updateBlackWhite, setColormap, setScaleMode } = useFitsStore();
  const { 
    transformState, 
    toggleTransform,
    setRotation,
    getAstronomicalRotation
  } = useImageTransform();
  
  const astronomicalRotation = getAstronomicalRotation();
  const stats = image?.stats;
  const [min, max] = stats ? [stats.rawMin, stats.rawMax] : [0, 1];

  return (
    <DropdownWrapper title="Display">
      <label>Colormap</label>
      <select
        id="colormap-select"
        value={display.colormap}
        disabled={!stats}
        onChange={(e) => setColormap(e.target.value)}
      >
        {['greys', 'viridis', 'plasma', 'magma', 'inferno', 'cividis'].map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label>Scale Mode</label>
      <div className="scale-mode-buttons">
        {scaleLabels.map((label, idx) => (
          <button
            key={label}
            className={display.scaleMode === idx ? 'active' : ''}
            disabled={!stats}
            onClick={() => setScaleMode(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      <label>Black Point</label>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={display.black}
        disabled={!stats}
        onChange={(e) => updateBlackWhite(+e.target.value, display.white)}
      />

      <label>White Point</label>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={display.white}
        disabled={!stats}
        onChange={(e) => updateBlackWhite(display.black, +e.target.value)}
      />

      <label>
        <input
          type="checkbox"
          checked={display.reverse}
          disabled={!stats}
          onChange={(e) => setColormap(display.colormap, e.target.checked)}
        />
        Reverse
      </label>
      
      {/* Add transformation controls */}
      <div className="transformation-controls" style={{ marginTop: '1rem' }}>
        <label>Image Orientation</label>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button 
            onClick={() => toggleTransform('flipHorizontal')}
            disabled={transformState.wcsLocked}
            style={{
              background: transformState.flipHorizontal ? '#4a90e2' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              opacity: transformState.wcsLocked ? 0.5 : 1,
              flex: 1
            }}
          >
            Flip H {transformState.wcsLocked ? '(WCS locked)' : ''}
          </button>
          <button 
            onClick={() => toggleTransform('flipVertical')}
            disabled={transformState.wcsLocked}
            style={{
              background: transformState.flipVertical ? '#4a90e2' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              opacity: transformState.wcsLocked ? 0.5 : 1,
              flex: 1
            }}
          >
            Flip V {transformState.wcsLocked ? '(WCS locked)' : ''}
          </button>
        </div>
        
        <label>
      Rotation ({astronomicalRotation.toFixed(1)}°) ↺
      {transformState.wcsLocked ? ' from North' : ''}
    </label>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      value={astronomicalRotation}
      onChange={(e) => {
        const newRotation = Number(e.target.value);
        setRotation(newRotation);
      }}
      style={{ width: '100%', marginTop: '0.5rem' }}
    />

      </div>
    </DropdownWrapper>
  );
}
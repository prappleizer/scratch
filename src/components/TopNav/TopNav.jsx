// TopNav.jsx
import React, { useEffect } from 'react';
import useFitsStore from '../../fitsStore';
import WCSDisplay from './WCSDisplay';
import { calculateWCSTransformations } from '../../utils/wcsUtils';
import { useImageTransform } from '../../contexts/ImageTransformContext';

export default function TopNav() {
  const { loadFits } = useFitsStore();
  const hasWCS = !!useFitsStore(state => state.image?.wcs);
  const wcs = useFitsStore(state => state.image?.wcs);
  
  // Get transform state and lock method from context
  const { 
    transformState, 
    lockToWCS, 
    setWcsTransformValues 
  } = useImageTransform();

  const handleOpen = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFits(file);
  };
  
  // Store WCS transformations when WCS is available
  useEffect(() => {
    if (hasWCS && wcs) {
      const transformations = calculateWCSTransformations(wcs);
      if (transformations) {
        setWcsTransformValues(transformations);
      }
    }
  }, [hasWCS, wcs, setWcsTransformValues]);
  
  const handleLockToWCS = () => {
    if (!hasWCS) return;
    lockToWCS();
  };

  return (
    <div className="header">
      <h1 className="title">
        <span className="logo"></span> 
        FITS Viewer 
        <span className="version">v1.0.0</span>
      </h1>
      
      <label className="open-button">
        Open...
        <input type="file" accept=".fits" onChange={handleOpen} />
      </label>
      
      <div className="header-spacer"></div>
      
      <WCSDisplay />
      
      <button 
        className="wcs-button" 
        disabled={!hasWCS}
        onClick={handleLockToWCS}
      >
        {transformState.wcsLocked ? "Unlock WCS" : "Lock to WCS"}
      </button>
    </div>
  );
}
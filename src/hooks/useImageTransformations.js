// contexts/ImageTransformContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Create the context
const ImageTransformContext = createContext(null);

// Export the hook for consuming components
export function useImageTransform() {
  const context = useContext(ImageTransformContext);
  if (!context) {
    throw new Error('useImageTransform must be used within an ImageTransformProvider');
  }
  return context;
}

export function ImageTransformProvider({ children }) {
  // Core transformation state - with internal representation (clockwise)
  const [transformState, setTransformState] = useState({
    scale: 1,
    offset: { x: 0, y: 0 },
    rotationAngle: 0, // Internal: clockwise rotation
    flipHorizontal: false,
    flipVertical: false,
    wcsLocked: false
  });
  
  // Update offset (pan) specifically
  const updateOffset = useCallback((dx, dy) => {
    setTransformState(prev => ({
      ...prev,
      offset: {
        x: prev.offset.x + dx,
        y: prev.offset.y + dy
      }
    }));
  }, []);
  
  // Update a single property
  const updateTransform = useCallback((key, value) => {
    setTransformState(prev => {
      const newState = { ...prev, [key]: value };
      // If we change anything that affects orientation, we're no longer WCS locked
      if (['rotationAngle', 'flipHorizontal', 'flipVertical'].includes(key)) {
        newState.wcsLocked = false;
      }
      return newState;
    });
  }, []);
  
  // Reset transformations
  const resetTransformations = useCallback((keepPan = false) => {
    setTransformState(prev => ({
      ...prev,
      scale: 1,
      offset: keepPan ? prev.offset : { x: 0, y: 0 },
      rotationAngle: 0,
      flipHorizontal: false,
      flipVertical: false,
      wcsLocked: false
    }));
  }, []);
  
  // Set scale (zoom level)
  const setScale = useCallback((newScale) => {
    setTransformState(prev => ({
      ...prev,
      scale: newScale
    }));
  }, []);
  
  // Set horizontal flip
  const setFlipHorizontal = useCallback((flipped) => {
    setTransformState(prev => ({
      ...prev,
      flipHorizontal: flipped,
      wcsLocked: false // No longer WCS locked when flip changes
    }));
  }, []);
  
  // Set vertical flip
  const setFlipVertical = useCallback((flipped) => {
    setTransformState(prev => ({
      ...prev,
      flipVertical: flipped,
      wcsLocked: false // No longer WCS locked when flip changes
    }));
  }, []);
  
  // Convert internal rotation to astronomical rotation (counterclockwise)
  const getAstronomicalRotation = useCallback(() => {
    // When not flipped horizontally: invert the angle (clockwise → counterclockwise)
    // When flipped horizontally: same angle (flip inverts rotation direction)
    return transformState.flipHorizontal 
      ? transformState.rotationAngle 
      : (360 - transformState.rotationAngle) % 360;
  }, [transformState.rotationAngle, transformState.flipHorizontal]);
  
  // Convert astronomical rotation to internal rotation
  const setAstronomicalRotation = useCallback((astronomicalDegrees) => {
    // When not flipped horizontally: invert the angle (counterclockwise → clockwise)
    // When flipped horizontally: same angle (flip already inverts direction)
    const internalDegrees = transformState.flipHorizontal 
      ? astronomicalDegrees 
      : (360 - astronomicalDegrees) % 360;
    
    setTransformState(prev => ({
      ...prev,
      rotationAngle: internalDegrees,
      wcsLocked: false // No longer WCS locked when rotation changes
    }));
  }, [transformState.flipHorizontal]);
  
  // Low-level internal rotation setter (clockwise, for system use)
  const setInternalRotation = useCallback((clockwiseDegrees) => {
    setTransformState(prev => ({
      ...prev,
      rotationAngle: clockwiseDegrees,
      wcsLocked: false
    }));
  }, []);
  
  // Toggle flip and handle rotation conversion
  const toggleTransform = useCallback((key) => {
    if (key === 'flipHorizontal') {
      // When toggling horizontal flip, we need to adjust rotation to maintain
      // the same visual orientation but keep astronomical convention correct
      const currentAstronomicalRotation = getAstronomicalRotation();
      
      setTransformState(prev => {
        const newFlipState = !prev.flipHorizontal;
        
        // Calculate new internal rotation that preserves astronomical angle
        const newInternalRotation = newFlipState 
          ? currentAstronomicalRotation 
          : (360 - currentAstronomicalRotation) % 360;
        
        return {
          ...prev,
          flipHorizontal: newFlipState,
          rotationAngle: newInternalRotation,
          wcsLocked: false
        };
      });
    } else {
      // Handle other toggles normally
      setTransformState(prev => ({
        ...prev,
        [key]: !prev[key],
        wcsLocked: key === 'flipVertical' ? false : prev.wcsLocked
      }));
    }
  }, [getAstronomicalRotation]);
  
  // WCS transformation values - track astronomical values
  const [wcsTransform, setWcsTransform] = useState({
    rotationAngle: 0, // Astronomical convention (counterclockwise)
    flipHorizontal: false
  });
  
  // Set WCS transformation values
  const setWcsTransformValues = useCallback((transformations) => {
    if (transformations) {
      // Store transformations in astronomical convention
      setWcsTransform(transformations);
    }
  }, []);
  
  // Lock to WCS
  const lockToWCS = useCallback(() => {
    // If we're already locked, unlock
    if (transformState.wcsLocked) {
      resetTransformations(true); // Keep pan
      return;
    }
    
    // Save current scale and offset
    const currentScale = transformState.scale;
    const currentOffset = { ...transformState.offset };
    
    // Get WCS transformations - in astronomical convention
    const { rotationAngle: wcsRotation, flipHorizontal: wcsFlip } = wcsTransform;
    
    // Convert to internal rotation (clockwise)
    const internalRotation = wcsFlip 
      ? wcsRotation 
      : (360 - wcsRotation) % 360;
    
    // Apply WCS transformations
    setTransformState({
      scale: currentScale,
      offset: currentOffset,
      rotationAngle: internalRotation, // Apply internal rotation
      flipHorizontal: wcsFlip,
      flipVertical: false,
      wcsLocked: true
    });
  }, [transformState, wcsTransform, resetTransformations]);
  
  // Expose values and methods
  const value = {
    transformState,
    updateTransform,
    updateOffset,
    toggleTransform,
    resetTransformations,
    setRotation: setAstronomicalRotation, // Public API uses astronomical convention
    getAstronomicalRotation, // Public API to get astronomical rotation
    setScale,
    setFlipHorizontal,
    setFlipVertical,
    setWcsTransformValues,
    lockToWCS,
    wcsTransform
  };
  
  return (
    <ImageTransformContext.Provider value={value}>
      {children}
    </ImageTransformContext.Provider>
  );
}
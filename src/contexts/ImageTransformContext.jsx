// contexts/ImageTransformContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

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
  
  // WCS transformation values - track astronomical values
  const [wcsTransform, setWcsTransform] = useState({
    rotationAngle: 0, // Astronomical convention (counterclockwise)
    flipHorizontal: false
  });
  
  // Track WCS-relative rotation separately
  const [wcsRelativeRotation, setWcsRelativeRotation] = useState(0);
  
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
    
    // Reset WCS-relative rotation
    setWcsRelativeRotation(0);
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
    // When WCS is locked, return the stored WCS-relative rotation
    if (transformState.wcsLocked) {
      return wcsRelativeRotation;
    }
    
    // Normal mode: convert internal to astronomical
    return transformState.flipHorizontal 
      ? transformState.rotationAngle 
      : (360 - transformState.rotationAngle) % 360;
  }, [transformState, wcsRelativeRotation]);
  
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
  
  // Set rotation while in WCS mode - rotation is relative to north
  const setRotationWhileWcsLocked = useCallback((astronomicalDegrees) => {
    // Store the WCS-relative rotation
    setWcsRelativeRotation(astronomicalDegrees);
    
    // Convert from WCS-relative rotation to internal rotation
    let internalRotation;
    if (transformState.flipHorizontal) {
      // If flipped, adjust accordingly
      internalRotation = (wcsTransform.rotationAngle + astronomicalDegrees) % 360;
    } else {
      internalRotation = (wcsTransform.rotationAngle - astronomicalDegrees + 360) % 360;
      internalRotation = (360 - internalRotation) % 360; // Convert to clockwise
    }
    
    // Update the transform state
    setTransformState(prev => ({
      ...prev,
      rotationAngle: internalRotation,
      wcsLocked: true // Stay in WCS mode
    }));
    
    console.log(`WCS Rotation: ${astronomicalDegrees}° from North, internal: ${internalRotation}°`);
  }, [transformState.flipHorizontal, wcsTransform.rotationAngle]);
  
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
    // Prevent changes if WCS is locked
    if (transformState.wcsLocked) {
      console.log("Cannot modify transformations while WCS is locked");
      return;
    }
    
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
  }, [transformState.wcsLocked, getAstronomicalRotation]);
  
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
    
    // Reset WCS-relative rotation to 0
    setWcsRelativeRotation(0);
    
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
    
    console.log(`WCS Locked: Setting internal rotation to ${internalRotation}° with ${wcsFlip ? 'horizontal flip' : 'no horizontal flip'}`);
  }, [transformState, wcsTransform, resetTransformations]);
  
  // Expose values and methods
  const value = {
    transformState,
    updateTransform,
    updateOffset,
    toggleTransform,
    resetTransformations,
    // Use the appropriate rotation setter based on WCS lock state
    setRotation: transformState.wcsLocked 
      ? setRotationWhileWcsLocked 
      : setAstronomicalRotation,
    getAstronomicalRotation,
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
// components/OrientationRosette.jsx
import React from 'react';
import { useImageTransform } from '../contexts/ImageTransformContext';
import useFitsStore from '../fitsStore';

export default function OrientationRosette() {
  const { transformState, wcsTransform } = useImageTransform();
  const hasWCS = !!useFitsStore(state => state.image?.wcs);
  
  // Calculate display angles for X and Y based on the current image transformations
  let xAngle = transformState.rotationAngle; // X follows rotation
  let yAngle = (transformState.rotationAngle + 270) % 360; // Y is 90° CCW from X
  
  // Adjust for flips
  if (transformState.flipHorizontal) {
    // When flipped horizontally, X points opposite direction
    xAngle = (xAngle + 180) % 360;
  }
  
  if (transformState.flipVertical) {
    // When flipped vertically, Y points opposite direction
    yAngle = (yAngle + 180) % 360;
  }
  
  // Calculate WCS arrow directions
  let northAngle, eastAngle;
  
  if (transformState.wcsLocked) {
    // When WCS locked:
    // North is up (270° in screen coordinates) 
    // East is to the left (180° in screen coordinates) 
    northAngle = 270;
    eastAngle = 180;
    
    // Unless user has rotated while in WCS mode
    if (transformState.rotationAngle !== wcsTransform.rotationAngle ||
        transformState.flipHorizontal !== wcsTransform.flipHorizontal) {
      // Calculate rotation difference
      let rotationOffset = (transformState.rotationAngle - wcsTransform.rotationAngle + 360) % 360;
      
      northAngle = (northAngle + rotationOffset) % 360;
      eastAngle = (eastAngle + rotationOffset) % 360;
      
      // If the flip state changed, east is on the other side of north
      if (transformState.flipHorizontal !== wcsTransform.flipHorizontal) {
        eastAngle = (northAngle + 270) % 360; // Flip East to opposite side of North
      }
    }
  } else if (hasWCS) {
    // Calculate where north and east point based on WCS parameters
    // and current transformations
    
    // Start with the WCS-aligned state (north up, east left)
    northAngle = 270; // North up
    
    // Calculate rotation from WCS-aligned state
    const wcsInternalRotation = wcsTransform.flipHorizontal
      ? wcsTransform.rotationAngle
      : (360 - wcsTransform.rotationAngle) % 360;
    
    const currentRotation = transformState.rotationAngle;
    const rotationDifference = (currentRotation - wcsInternalRotation + 360) % 360;
    
    // Apply the rotation difference
    northAngle = (northAngle - rotationDifference + 360) % 360;
    
    // East is 90° counterclockwise from North if parity is preserved,
    // or 90° clockwise if parity is flipped
    const parityFlipped = 
      (transformState.flipHorizontal && !wcsTransform.flipHorizontal) ||
      (!transformState.flipHorizontal && wcsTransform.flipHorizontal);
    
    if (parityFlipped) {
      eastAngle = (northAngle + 270) % 360; // 90° clockwise
    } else {
      eastAngle = (northAngle + 90) % 360;  // 90° counterclockwise
    }
  } else {
    // No WCS available
    northAngle = 0;
    eastAngle = 0;
  }
  
  console.log("OrientationRosette:", {
    rotation: transformState.rotationAngle,
    flipH: transformState.flipHorizontal,
    flipV: transformState.flipVertical,
    wcsLocked: transformState.wcsLocked,
    wcsRotation: wcsTransform.rotationAngle,
    wcsFlip: wcsTransform.flipHorizontal,
    xAngle,
    yAngle,
    northAngle,
    eastAngle
  });
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      width: '90px',
      height: '90px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '80%',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Center dot */}
        
        
        {/* North arrow */}
        <Arrow 
          angle={northAngle} 
          color="#4a90e2" 
          label="N" 
          visible={hasWCS}
        />
        
        {/* East arrow */}
        <Arrow 
          angle={eastAngle} 
          color="#4a90e2" 
          label="E" 
          visible={hasWCS}
        />
        
        {/* X arrow */}
        <Arrow 
          angle={xAngle} 
          color="#e24a4a" 
          label="X" 
          visible={true}
        />
        
        {/* Y arrow */}
        <Arrow 
          angle={yAngle} 
          color="#e24a4a" 
          label="Y" 
          visible={true}
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: 'white',
          transform: 'translate(-50%, -50%)',
        }} />
      </div>
    </div>
  );
}

function Arrow({ angle, color, label, visible }) {
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '30px',
      height: '2px',
      background: color,
      transform: `rotate(${angle}deg)`,
      transformOrigin: '0 0',
      opacity: 0.8
    }}>
      <div style={{
        position: 'absolute',
        right: '0',
        top: '-4px',
        width: '0',
        height: '0',
        borderTop: '4px solid transparent',
        borderBottom: '4px solid transparent',
        borderLeft: `10px solid ${color}`
      }} />
      <div style={{
        position: 'absolute',
        right: '-12px',
        top: '-8px',
        color: color,
        fontSize: '10px',
        fontWeight: 'bold'
      }}>
        {label}
      </div>
    </div>
  );
}
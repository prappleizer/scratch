// useCursorTracker.js
import { useState, useEffect, useCallback } from 'react';
import useFitsStore from '../fitsStore';
import { calculateCelestialCoordinates } from '../utils/wcsUtils';

export const useCursorTracker = (transformState, containerRef, canvasRef) => {
    const [cursor, setCursor] = useState({
      screenX: 0,
      screenY: 0,
      imageX: 0,
      imageY: 0,
      value: null,
      visible: false,
      isInBounds: false,
      ra: null,
      dec: null,
      raSex: '',
      decSex: '',
      raDeg: '',
      decDeg: ''
    });
  
  const image = useFitsStore(state => state.image);
  
  const screenToImageCoords = useCallback((screenX, screenY) => {
    if (!containerRef.current || !image?.width || !image?.height) {
      return { x: 0, y: 0, isInBounds: false };
    }
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Get coordinates relative to container
    const viewerX = screenX - containerRect.left;
    const viewerY = screenY - containerRect.top;
    
    // Calculate center of container
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Adjust for the centered position
    const adjustedX = viewerX - centerX;
    const adjustedY = viewerY - centerY;
    
    // Apply inverse transformations
    const { scale, offset, rotationAngle, flipHorizontal, flipVertical } = transformState;
    
    // Account for panning
    const unpannedX = adjustedX - offset.x;
    const unpannedY = adjustedY - offset.y;
    
    // Account for scaling
    const unscaledX = unpannedX / scale;
    const unscaledY = unpannedY / scale;
    
    
    let rotatedX = unscaledX;
    let rotatedY = unscaledY;

    if (rotationAngle !== 0) {
    // Convert degrees to radians
    const radians = rotationAngle * Math.PI / 180;
    
    // Get cos and sin
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // IMPORTANT: Adjust rotation direction based on horizontal flip
    // If horizontally flipped, we need to reverse the direction of rotation
    if (flipHorizontal) {
      // For flipped state, use opposite rotation direction
      rotatedX = unscaledX * cos - unscaledY * sin;
      rotatedY = unscaledX * sin + unscaledY * cos;
    } else {
      // For non-flipped state, use normal rotation direction
      rotatedX = unscaledX * cos + unscaledY * sin;
      rotatedY = -unscaledX * sin + unscaledY * cos;
    }
  }
    
    // Account for flips
    const unflippedX = flipHorizontal ? -rotatedX : rotatedX;
    const unflippedY = flipVertical ? -rotatedY : rotatedY;
    
    // Add half the image dimensions to convert from center-relative to image coordinates
    // Add half the image dimensions to convert from center-relative to image coordinates
    const imageX = unflippedX + (image.width / 2);
    const imageY = unflippedY + (image.height / 2);

    // Convert to DS9 convention (1-indexed with bottom-left origin)
    const ds9X = imageX + 0.5;
    const ds9Y = image.height - imageY + 0.5;

    // Calculate pixel indices
    const pixelX = Math.floor(ds9X - 0.5); 
    const pixelY = Math.floor(ds9Y - 0.5);

    // Check bounds on the pixel indices that will be used for data access
    const isInBounds = (
    pixelX >= 0 && pixelX < image.width &&
    pixelY >= 0 && pixelY < image.height
    );

    const cursorObj = {
        imageX: ds9X,
        imageY: ds9Y,
        pixelX,
        pixelY,
        isInBounds
      };
      
      // Add WCS coordinates if available
      if (image.wcs && isInBounds) {
        return calculateCelestialCoordinates(cursorObj, image.wcs);
      }
      
      return cursorObj;
    }, [transformState, image]);
  
  
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !image?.width) return;
    
    const coords = screenToImageCoords(e.clientX, e.clientY);
    
    
    // Get pixel value if in bounds
    let value = null;
    if (coords.isInBounds) {
        const pixelX = coords.pixelX;
        const pixelY = coords.pixelY;
        
        // Check bounds
        if (pixelX >= 0 && pixelX < image.width && 
            pixelY >= 0 && pixelY < image.height) {
          
          // Since the array is already in bottom-to-top order (origin at bottom left),
          // don't flip the Y coordinate again
          const dataIndex = pixelY * image.width + pixelX;
          
          if (image.data && dataIndex >= 0 && dataIndex < image.data.length) {
            value = image.data[dataIndex];
          }
        }
    }
    
    setCursor({
        screenX: e.clientX,
        screenY: e.clientY,
        imageX: coords.imageX,
        imageY: coords.imageY,
        value,
        visible: coords.isInBounds,
        isInBounds: coords.isInBounds,
        ra: coords.ra,
        dec: coords.dec,
        raSex: coords.raSex || '',
        decSex: coords.decSex || '',
        raDeg: coords.raDeg || '',
        decDeg: coords.decDeg || ''
      });
    }, [screenToImageCoords, image]);
  
  const handleMouseLeave = useCallback(() => {
    setCursor(prev => ({ ...prev, visible: false }));
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, handleMouseMove, handleMouseLeave]);
  
  return cursor;
};

// Detailed log of position if needed
// console.log('Coordinates:', {
//     screen: { x: screenX, y: screenY },
//     viewer: { x: viewerX, y: viewerY },
//     adjusted: { x: adjustedX, y: adjustedY },
//     unpanned: { x: unpannedX, y: unpannedY },
//     unscaled: { x: unscaledX, y: unscaledY },
//     rotated: { x: rotatedX, y: rotatedY },
//     unflipped: { x: unflippedX, y: unflippedY },
//     image: { x: imageX, y: imageY },
//     ds9: { x: ds9X, y: ds9Y },
//     pixel: { x: pixelX, y: pixelY },
//     pixelBasedBoundsCheck: {
//       result: (pixelX >= 0 && pixelX < image.width && 
//                pixelY >= 0 && pixelY < image.height),
//       checks: {
//         pixelXInRange: { 
//           check: `${pixelX} >= 0 && ${pixelX} < ${image.width}`, 
//           result: (pixelX >= 0 && pixelX < image.width)
//         },
//         pixelYInRange: { 
//           check: `${pixelY} >= 0 && ${pixelY} < ${image.height}`, 
//           result: (pixelY >= 0 && pixelY < image.height)
//         }
//       }
//     },
//     imageBasedBoundsCheck: {
//       result: (imageX >= 0 && imageX < image.width && 
//                imageY >= 0 && imageY < image.height),
//       checks: {
//         imageXInRange: { 
//           check: `${imageX} >= 0 && ${imageX} < ${image.width}`, 
//           result: (imageX >= 0 && imageX < image.width)
//         },
//         imageYInRange: { 
//           check: `${imageY} >= 0 && ${imageY} < ${image.height}`, 
//           result: (imageY >= 0 && imageY < image.height)
//         }
//       }
//     },
//     transformState
//   });
// ViewerPanel.jsx
import React, { useEffect, useRef, useCallback,useState } from 'react';
import { useCursorTracker } from '../hooks/useCursorTracker';
import { useCursorUpdater } from '../contexts/CursorContext';
import { useImageTransform } from '../contexts/ImageTransformContext';
import OrientationRosette from './OrientationRosette';
import WebGLCanvas from './FITSCanvas';

export default function ViewerPanel() {
  // Get transform state and methods from context
  const { 
    transformState, 
    updateOffset, 
    setScale 
  } = useImageTransform();
  
  // Container and canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  
  // Get cursor tracking based on current transform state
  const cursor = useCursorTracker(transformState, containerRef, canvasRef);
  
  // Update cursor context
  const updateCursor = useCursorUpdater();
  
  useEffect(() => {
    if (cursor) {
      updateCursor(cursor);
    }
  }, [cursor, updateCursor]);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    if (frameRef.current) return; // skip if already scheduled
    
    frameRef.current = requestAnimationFrame(() => {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      updateOffset(dx, dy);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      frameRef.current = null;
    });
  }, [isDragging, updateOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle zoom with proper anchoring
  const handleZoom = useCallback((e) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Get mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Get position relative to the center of the container
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Get mouse position relative to the center
    const relativeX = mouseX - centerX - transformState.offset.x;
    const relativeY = mouseY - centerY - transformState.offset.y;
    
    // Calculate new scale and offset
    const newScale = Math.max(0.1, Math.min(transformState.scale * zoomFactor, 100));
    const newOffsetX = mouseX - centerX - (relativeX * newScale / transformState.scale);
    const newOffsetY = mouseY - centerY - (relativeY * newScale / transformState.scale);
    
    // First update scale
    setScale(newScale);
    
    // Then update offset
    updateOffset(
      newOffsetX - transformState.offset.x,
      newOffsetY - transformState.offset.y
    );
  }, [transformState, setScale, updateOffset]);
  
  // Clean up on unmount
  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);
  
  // Add wheel event listener
  useEffect(() => {
    const node = document.querySelector('.viewer-panel');
    if (node) {
      node.addEventListener('wheel', handleZoom, { passive: false });
      return () => node.removeEventListener('wheel', handleZoom);
    }
  }, [handleZoom]);
  
  // Handle window-level mouse up
  useEffect(() => {
    const handleWindowMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [handleMouseUp]);
  
  return (
    <>
      {/* Tooltip */}
      {cursor.visible && (() => {
        const buffer = 120;
        let left = cursor.screenX + 10;
        let top = cursor.screenY + 20;
  
        if (cursor.screenX > window.innerWidth - 400) {
          left = cursor.screenX - 150;
        }
        if (cursor.screenY > window.innerHeight - buffer) {
          top = cursor.screenY - 50;
        }
        
        return (
          <div
            style={{
              position: 'fixed',
              left,
              top,
              background: '#222',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              pointerEvents: 'none',
              zIndex: 9999,
              whiteSpace: 'nowrap',
            }}
          >
            {`x: ${cursor.imageX?.toFixed(2)}, y: ${cursor.imageY?.toFixed(2)}`}<br />
            {`value: ${cursor.value ?? '–'}`}
          </div>
        );
      })()}
  
      {/* ViewerPanel */}
      <div
        className="viewer-panel"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={containerRef}
        style={{
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'crosshair',
          background: '#000',
        }}
      >
         {/* <OrientationRosette /> */}
        <div
          ref={canvasContainerRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `
              translate(-50%, -50%) 
              translate(${transformState.offset.x}px, ${transformState.offset.y}px)
              scale(${transformState.flipHorizontal ? -transformState.scale : transformState.scale}, 
                    ${transformState.flipVertical ? -transformState.scale : transformState.scale})
              rotate(${transformState.rotationAngle}deg)
            `,
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        >
          
          <WebGLCanvas ref={canvasRef} />
          
        </div>
      </div>
    </>
  );
}
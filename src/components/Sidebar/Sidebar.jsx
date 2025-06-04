import React, { useState, useRef, useEffect } from 'react';
import FileSection from './FileSection';
import DisplaySection from './DisplaySection';

export default function Sidebar() {
  // Default width and min/max constraints
  const [width, setWidth] = useState(200);
  const minWidth = 150;
  const maxWidth = 500;
  
  // Refs for tracking resize state
  const sidebarRef = useRef(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  
  // Handle resize start
  const handleResizeStart = (e) => {
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    // Add temporary event listeners for resize and end
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Prevent default to avoid text selection
    e.preventDefault();
    
    // Add a resize cursor to the entire document while resizing
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection
  };
  
  // Handle resize move
  const handleResize = (e) => {
    if (!isResizingRef.current) return;
    
    // Calculate new width based on mouse movement
    const delta = startXRef.current - e.clientX;
    let newWidth = startWidthRef.current + delta;
    
    // Enforce min/max constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // Update width
    setWidth(newWidth);
  };
  
  // Handle resize end
  const handleResizeEnd = () => {
    isResizingRef.current = false;
    
    // Remove temporary event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Restore cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);
  
  return (
    <div 
      className="controls" 
      ref={sidebarRef}
      style={{ 
        width: `${width}px`,
        position: 'relative'
      }}
    >
      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '6px',
          height: '100%',
          cursor: 'ew-resize',
          zIndex: 10
        }}
      />
      
      {/* Sidebar content - kept the same as your original */}
      <div className="sidebar-content" style={{ paddingLeft: '6px' }}>
        <FileSection />
        <DisplaySection />
        {/* Future: Histogram, Analysis, etc */}
      </div>
    </div>
  );
}
// HeaderModal.jsx - with resizing functionality added
import React, { useState, useEffect, useRef } from 'react';

const HeaderModal = ({ header, headerText, onClose }) => {
  const [viewMode, setViewMode] = useState('table');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const modalRef = useRef(null);
  const [recentlyEnded, setRecentlyEnded] = useState(false);
  
  // Convert header object to formatted JSON string
  const jsonHeader = JSON.stringify(header, null, 2);
  
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);
  
  // Center the modal when it first renders
  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2
      });
    }
  }, []);
  
  // Handle dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle') && !e.target.closest('.resize-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  // Handle resizing
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
    
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      // Update position based on mouse movement
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      e.preventDefault();
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Set a higher minimum width to ensure buttons don't get cut off
      const minWidth = 450; // Adjust this value based on your header content
      const minHeight = 200;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;
      
      // Apply resize logic with updated minimum values...
      switch (resizeDirection) {
        case 'e':
          newWidth = Math.max(minWidth, resizeStart.width + deltaX);
          break;
        case 's':
          newHeight = Math.max(minHeight, resizeStart.height + deltaY);
          break;
        case 'se':
          newWidth = Math.max(minWidth, resizeStart.width + deltaX);
          newHeight = Math.max(minHeight, resizeStart.height + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(minWidth, resizeStart.width - deltaX);
          newX = resizeStart.posX + Math.min(deltaX, resizeStart.width - minWidth);
          newHeight = Math.max(minHeight, resizeStart.height + deltaY);
          break;
        case 'ne':
          newWidth = Math.max(minWidth, resizeStart.width + deltaX);
          newHeight = Math.max(minHeight, resizeStart.height - deltaY);
          newY = resizeStart.posY + Math.min(deltaY, resizeStart.height - minHeight);
          break;
        case 'nw':
          newWidth = Math.max(minWidth, resizeStart.width - deltaX);
          newHeight = Math.max(minHeight, resizeStart.height - deltaY);
          newX = resizeStart.posX + Math.min(deltaX, resizeStart.width - minWidth);
          newY = resizeStart.posY + Math.min(deltaY, resizeStart.height - minHeight);
          break;
        case 'w':
          newWidth = Math.max(minWidth, resizeStart.width - deltaX);
          newX = resizeStart.posX + Math.min(deltaX, resizeStart.width - minWidth);
          break;
        case 'n':
          newHeight = Math.max(minHeight, resizeStart.height - deltaY);
          newY = resizeStart.posY + Math.min(deltaY, resizeStart.height - minHeight);
          break;
        default:
          break;
      }
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
  };
  const handleOverlayClick = (e) => {
    // Only close if we're not dragging, resizing, or just finished a drag/resize
    if (!isDragging && !isResizing && !recentlyEnded) {
      onClose();
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setRecentlyEnded(true); // Set this flag when operation ends
    
    // Re-enable text selection and scrolling
    document.body.style.userSelect = '';
    document.body.style.overflow = '';
    
    // Reset the recently ended flag after a short delay
    setTimeout(() => {
      setRecentlyEnded(false);
    }, 100); // 100ms delay should be enough
  };
  
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove]);
  
  return (
    <div 
  className="modal-overlay" 
  onClick={handleOverlayClick}  // Changed from directly calling onClose
  onMouseDown={handleMouseDown}
>
      <div 
        ref={modalRef}
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Resize handles */}
        <div className="resize-handle e" onMouseDown={(e) => handleResizeStart(e, 'e')}></div>
        <div className="resize-handle s" onMouseDown={(e) => handleResizeStart(e, 's')}></div>
        <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, 'se')}></div>
        <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, 'sw')}></div>
        <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, 'ne')}></div>
        <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, 'nw')}></div>
        <div className="resize-handle w" onMouseDown={(e) => handleResizeStart(e, 'w')}></div>
        <div className="resize-handle n" onMouseDown={(e) => handleResizeStart(e, 'n')}></div>
        
        <div className="modal-header drag-handle">
          <div className="drag-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <h4>FITS Header</h4>
          <div className="toggle-container">
            <button 
              className={viewMode === 'table' ? 'active' : ''} 
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
            <button 
              className={viewMode === 'json' ? 'active' : ''} 
              onClick={() => setViewMode('json')}
            >
              JSON View
            </button>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {viewMode === 'table' ? (
            <div className="header-table">
              <table>
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Value</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(header).map(([key, item], index) => (
                    <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                      <td>{key}</td>
                      <td>{typeof item === 'object' ? item.value : item}</td>
                      <td>{typeof item === 'object' ? item.comment : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="header-json">
              <pre>{jsonHeader}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderModal;
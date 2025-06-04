// contexts/CursorContext.jsx
import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

// Create the context
const CursorContext = createContext(null);

/**
 * Provider component that makes cursor data available to any nested components
 */
export function CursorProvider({ children }) {
  // The single source of truth (ref-based for performance)
  const cursorRef = useRef({
    screenX: 0,
    screenY: 0,
    imageX: 0,
    imageY: 0,
    pixelX: 0,
    pixelY: 0,
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
  
  // Reactive state for components that need to re-render on cursor changes
  const [reactiveCursor, setReactiveCursor] = useState(cursorRef.current);
  
  // Subscriber management for cursor updates
  const subscribers = useRef(new Set());
  
  // Update cursor position (called by ViewerPanel)
  const updateCursor = useCallback((newCursor) => {
    // Update the reference
    cursorRef.current = newCursor;
    
    // Update reactive state (~60fps is enough for displays)
    // Could add throttling here if needed
    setReactiveCursor(newCursor);
    
    // Notify any subscribers
    subscribers.current.forEach(callback => callback());
  }, []);
  
  // Subscribe to cursor changes (used by useSyncExternalStore)
  const subscribe = useCallback((callback) => {
    subscribers.current.add(callback);
    return () => subscribers.current.delete(callback);
  }, []);
  
  // Get current cursor value (without subscribing)
  const getCursor = useCallback(() => cursorRef.current, []);
  
  // Context value
  const contextValue = {
    cursor: reactiveCursor,      // For components that need to re-render
    updateCursor,                // For ViewerPanel to update cursor
    subscribe,                   // For advanced subscription management
    getCursor                    // For one-time access without re-renders
  };
  
  return (
    <CursorContext.Provider value={contextValue}>
      {children}
    </CursorContext.Provider>
  );
}

/**
 * Hook to use cursor data in components (causes re-renders on cursor changes)
 */
export function useCursor() {
  const context = useContext(CursorContext);
  
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  
  return context.cursor;
}

/**
 * Hook to get cursor updater function (for ViewerPanel)
 */
export function useCursorUpdater() {
  const context = useContext(CursorContext);
  
  if (!context) {
    throw new Error('useCursorUpdater must be used within a CursorProvider');
  }
  
  return context.updateCursor;
}

/**
 * Hook to get current cursor without subscribing to changes
 * (won't cause re-renders - use for event handlers and one-time access)
 */
export function useStaticCursor() {
  const context = useContext(CursorContext);
  
  if (!context) {
    throw new Error('useStaticCursor must be used within a CursorProvider');
  }
  
  return context.getCursor;
}
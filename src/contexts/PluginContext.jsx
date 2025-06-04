// contexts/PluginContext.jsx - revised
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Create the context
const PluginContext = createContext(null);

export function usePlugins() {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
}

export function PluginProvider({ children }) {
    const logDOMState = (action) => {
        console.log(`${action} - DOM elements count: ${document.querySelectorAll('*').length}`);
        console.log(`${action} - Body children: ${document.body.children.length}`);
        
        // Check for any suspicious elements
        const overlays = document.querySelectorAll('[id^="dc-"]');
        if (overlays.length > 0) {
          console.log(`${action} - Found ${overlays.length} plugin overlays that might not be cleaned up`);
          console.log(Array.from(overlays).map(el => el.id));
        }
      };
  // Track active plugins
  const [activePlugins, setActivePlugins] = useState({});
  
  // Track available plugins 
  const [availablePlugins, setAvailablePlugins] = useState({});
  
  // Use ref to avoid re-renders when checking isActive
  const activePluginsRef = useRef(activePlugins);
  
  // Update ref when state changes
  React.useEffect(() => {
    activePluginsRef.current = activePlugins;
  }, [activePlugins]);
  
  // Register a plugin
  const registerPlugin = useCallback((id, plugin) => {
    setAvailablePlugins(prev => {
      // Check if already registered
      if (prev[id]) return prev;
      
      console.log(`Plugin registered: ${id}`);
      return {
        ...prev,
        [id]: plugin
      };
    });
    
    return () => {
      // Return unregister function
      setAvailablePlugins(prev => {
        const { [id]: _, ...rest } = prev;
        console.log(`Plugin unregistered: ${id}`);
        return rest;
      });
      
      // Also deactivate if active
      if (activePluginsRef.current[id]) {
        setActivePlugins(prev => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      }
    };
  }, []);
  
  // Activate a plugin
  const activatePlugin = useCallback((id, initialState = {}) => {
    // Check if plugin exists
    if (!availablePlugins[id]) {
      console.error(`Cannot activate plugin: ${id} - not registered`);
      return false;
    }
    
    // Check if already active
    if (activePluginsRef.current[id]) {
      console.log(`Plugin already active: ${id}`);
      return true;
    }
    
    // Update state
    logDOMState(`Before activating plugin ${id}`);
    setActivePlugins(prev => {
      // Deactivate any exclusive plugins if this one is exclusive
      if (availablePlugins[id].exclusive) {
        const newState = { ...prev };
        
        // Deactivate other exclusive plugins
        Object.entries(availablePlugins).forEach(([pluginId, plugin]) => {
          if (plugin.exclusive && pluginId !== id && newState[pluginId]) {
            delete newState[pluginId];
            console.log(`Plugin deactivated (exclusive): ${pluginId}`);
          }
        });
        
        // Activate this plugin
        newState[id] = initialState;
        console.log(`Plugin activated: ${id}`);
        return newState;
      } else {
        // Just activate this plugin
        console.log(`Plugin activated: ${id}`);
        return {
          ...prev,
          [id]: initialState
        };
      }
    });
    
    return true;
  }, [availablePlugins]);
  
  // Deactivate a plugin
  const deactivatePlugin = useCallback((id) => {
    setActivePlugins(prev => {
      // Check if active
      if (!prev[id]) return prev;
      
      // Get the plugin before removing it
      const plugin = prev[id];
      logDOMState(`Before deactivating plugin ${id}`);
      
      // Deactivate
      const { [id]: _, ...rest } = prev;
      console.log(`Plugin deactivated: ${id}`);
      
      // Ensure any custom cleanup is handled
      if (availablePlugins[id]?.cleanup) {
        try {
          availablePlugins[id].cleanup(plugin);
        } catch (error) {
          console.error(`Error during plugin cleanup: ${id}`, error);
        }
      }
      
      return rest;
    });
  }, [availablePlugins]);
  
  
  // Update plugin state without triggering unnecessary re-renders
  const updatePluginState = useCallback((id, updateFn) => {
    setActivePlugins(prev => {
      if (!prev[id]) return prev;
      
      // Only update if needed
      const newState = updateFn(prev[id]);
      if (JSON.stringify(newState) === JSON.stringify(prev[id])) {
        return prev; // No change
      }
      
      return {
        ...prev,
        [id]: newState
      };
    });
  }, []);
  
  // Get plugin state
  const getPluginState = useCallback((id) => {
    return activePlugins[id] || null;
  }, [activePlugins]);
  
  // Check if plugin is active
  const isPluginActive = useCallback((id) => {
    return !!activePluginsRef.current[id];
  }, []);
  
  // Reset all plugins
  const resetAllPlugins = useCallback(() => {
    setActivePlugins({});
  }, []);
  
  const value = {
    registerPlugin,
    activatePlugin,
    deactivatePlugin,
    updatePluginState,
    getPluginState,
    isPluginActive,
    resetAllPlugins,
    activePlugins,
    availablePlugins
  };
  
  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  );
}
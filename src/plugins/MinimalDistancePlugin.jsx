// plugins/SimpleDistancePlugin.jsx
import React, { useEffect, useState, useRef } from 'react';
import { usePlugins } from '../contexts/PluginContext';
import { useStaticCursor } from '../contexts/CursorContext';

export const pluginMetadata = {
  id: 'simple-distance',
  name: 'Simple Distance Calculator',
  description: 'Measure distance between two points',
  keybindings: ['1', '2'],
  exclusive: true,
};

function MinimalDistancePlugin() {
  const { registerPlugin, activatePlugin, deactivatePlugin, getPluginState, isPluginActive } = usePlugins();
  const getCursor = useStaticCursor();
  const pluginId = pluginMetadata.id;
  
  // Use refs to avoid state updates during render
  const isProcessingKey = useRef(false);
  const point1Ref = useRef(null);
  const point2Ref = useRef(null);
  const [infoText, setInfoText] = useState("");
  
  // Register the plugin
  useEffect(() => {
    console.log("Registering simple plugin");
    const unregister = registerPlugin(pluginId, pluginMetadata);
    return unregister;
  }, [pluginId, registerPlugin]);
  
  // Handle key presses with debounce
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Skip if we're already processing a key
      if (isProcessingKey.current) return;
      isProcessingKey.current = true;
      
      setTimeout(() => {
        try {
          if (e.key === '1') {
            const cursor = getCursor();
            if (!cursor?.isInBounds) return;
            
            // Store point 1
            point1Ref.current = {
              x: cursor.imageX,
              y: cursor.imageY,
              ra: cursor.ra,
              dec: cursor.dec
            };
            point2Ref.current = null;
            
            // Activate plugin if not active
            if (!isPluginActive(pluginId)) {
              activatePlugin(pluginId, {});
            }
            
            // Update info text
            setInfoText(`Point 1 set at (${cursor.imageX.toFixed(1)}, ${cursor.imageY.toFixed(1)})`);
          }
          else if (e.key === '2') {
            // Only proceed if point 1 is set
            if (!point1Ref.current) return;
            
            const cursor = getCursor();
            if (!cursor?.isInBounds) return;
            
            // Store point 2
            point2Ref.current = {
              x: cursor.imageX,
              y: cursor.imageY,
              ra: cursor.ra,
              dec: cursor.dec
            };
            
            // Calculate distance
            const dx = point2Ref.current.x - point1Ref.current.x;
            const dy = point2Ref.current.y - point1Ref.current.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // Update info text
            let text = `Distance: ${distance.toFixed(2)} pixels\n`;
            text += `Point 1: (${point1Ref.current.x.toFixed(1)}, ${point1Ref.current.y.toFixed(1)})\n`;
            text += `Point 2: (${point2Ref.current.x.toFixed(1)}, ${point2Ref.current.y.toFixed(1)})`;
            
            if (point1Ref.current.ra && point2Ref.current.ra) {
              // Calculate sky distance if WCS available
              // Similar to your existing code
            }
            
            setInfoText(text);
            
            // Copy to clipboard
            const data = {
              point1: point1Ref.current,
              point2: point2Ref.current,
              distance: distance
            };
            navigator.clipboard.writeText(JSON.stringify(data, null, 2))
              .then(() => console.log("Copied to clipboard"))
              .catch(err => console.error("Failed to copy", err));
          }
          else if (e.key === 'Escape') {
            if (isPluginActive(pluginId)) {
              deactivatePlugin(pluginId);
              setInfoText("");
              point1Ref.current = null;
              point2Ref.current = null;
            }
          }
        } finally {
          // Always reset processing flag
          isProcessingKey.current = false;
        }
      }, 50); // Small delay to avoid rapid updates
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pluginId, activatePlugin, deactivatePlugin, isPluginActive, getCursor]);
  
  // Only render info text, no DOM manipulation
  return isPluginActive(pluginId) && infoText ? (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        zIndex: 1001,
        fontFamily: 'monospace',
        whiteSpace: 'pre-line'
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Distance Measurement</div>
      {infoText}
    </div>
  ) : null;
}

export default MinimalDistancePlugin;
// plugins/DistanceCalculatorPlugin.jsx - DOM-based implementation
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePlugins } from '../contexts/PluginContext';
import { useImageTransform } from '../contexts/ImageTransformContext';
import { useStaticCursor } from '../contexts/CursorContext';
import useFitsStore from '../fitsStore';

// Plugin registration metadata
export const pluginMetadata = {
  id: 'distance-calculator',
  name: 'Distance Calculator',
  description: 'Measure distance between two points',
  keybindings: ['1', '2'],
  exclusive: true, // Cannot be active with other exclusive plugins
};

function DistanceCalculatorPlugin() {
  const { registerPlugin, activatePlugin, deactivatePlugin, updatePluginState, getPluginState, isPluginActive } = usePlugins();
  const { transformState } = useImageTransform();
  const getCursor = useStaticCursor();
  const hasWCS = !!useFitsStore(state => state.image?.wcs);
  
  const pluginId = pluginMetadata.id;
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // DOM element refs
  const overlayRef = useRef(null);
  const lineOverlayRef = useRef(null);
  const viewerRef = useRef(null);
  const cleanupRef = useRef([]);
  
  // Register the plugin on mount
  useEffect(() => {
    const unregister = registerPlugin(pluginId, pluginMetadata);
    return () => {
      // Clean up DOM elements
      cleanupDOMElements();
      unregister();
    };
  }, [pluginId, registerPlugin]);
  
  // Calculate distance between two points
  const calculateDistance = useCallback((point1, point2) => {
    // Pixel distance (in image coordinates)
    const pixelDx = point2.x - point1.x;
    const pixelDy = point2.y - point1.y;
    const pixelDistance = Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);
    
    let skyDistance = null;
    let formattedSkyDistance = '';
    
    // Calculate celestial distance if WCS is available
    if (point1.hasWCS && point2.hasWCS) {
      // Convert to radians
      const ra1 = point1.ra * Math.PI / 180;
      const dec1 = point1.dec * Math.PI / 180;
      const ra2 = point2.ra * Math.PI / 180;
      const dec2 = point2.dec * Math.PI / 180;
      
      // Haversine formula for great circle distance
      const dlon = ra2 - ra1;
      const dlat = dec2 - dec1;
      const a = Math.sin(dlat/2)**2 + Math.cos(dec1) * Math.cos(dec2) * Math.sin(dlon/2)**2;
      const c = 2 * Math.asin(Math.sqrt(a));
      
      // Distance in degrees
      skyDistance = c * 180 / Math.PI;
      
      // Format the distance
      if (skyDistance < 1/60) {
        // Less than 1 arcmin, show in arcsec
        formattedSkyDistance = `${(skyDistance * 3600).toFixed(2)} arcsec`;
      } else if (skyDistance < 1) {
        // Less than 1 degree, show in arcmin
        formattedSkyDistance = `${(skyDistance * 60).toFixed(2)} arcmin`;
      } else {
        // More than 1 degree
        formattedSkyDistance = `${skyDistance.toFixed(3)} deg`;
      }
    }
    
    return {
      pixelDistance,
      skyDistance,
      formattedSkyDistance
    };
  }, []);
  
  // Clean up DOM elements
  const cleanupDOMElements = useCallback(() => {
    // Remove all DOM elements we created
    if (overlayRef.current && overlayRef.current.parentNode) {
      overlayRef.current.parentNode.removeChild(overlayRef.current);
      overlayRef.current = null;
    }
    
    if (lineOverlayRef.current && lineOverlayRef.current.parentNode) {
      lineOverlayRef.current.parentNode.removeChild(lineOverlayRef.current);
      lineOverlayRef.current = null;
    }
    
    // Clean up any other elements registered for cleanup
    cleanupRef.current.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    cleanupRef.current = [];
  }, []);
  
  // Create or update the line overlay
  const updateLineOverlay = useCallback((point1, point2 = null) => {
    if (!viewerRef.current) {
      viewerRef.current = document.querySelector('.viewer-panel');
    }
    
    if (!viewerRef.current) return;
    
    // Create line overlay if it doesn't exist
    if (!lineOverlayRef.current) {
      const overlay = document.createElement('div');
      overlay.id = 'dc-line-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '1000';
      
      viewerRef.current.appendChild(overlay);
      lineOverlayRef.current = overlay;
    }
    
    // Clear previous content
    lineOverlayRef.current.innerHTML = '';
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    
    // Add point1
    const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot1.setAttribute('cx', point1.x);
    dot1.setAttribute('cy', point1.y);
    dot1.setAttribute('r', '6');
    dot1.setAttribute('fill', 'rgba(255, 0, 0, 0.7)');
    dot1.setAttribute('stroke', 'white');
    dot1.setAttribute('stroke-width', '2');
    svg.appendChild(dot1);
    
    // Add point2 and connecting line if available
    if (point2) {
      const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot2.setAttribute('cx', point2.x);
      dot2.setAttribute('cy', point2.y);
      dot2.setAttribute('r', '6');
      dot2.setAttribute('fill', 'rgba(0, 255, 0, 0.7)');
      dot2.setAttribute('stroke', 'white');
      dot2.setAttribute('stroke-width', '2');
      svg.appendChild(dot2);
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', point1.x);
      line.setAttribute('y1', point1.y);
      line.setAttribute('x2', point2.x);
      line.setAttribute('y2', point2.y);
      line.setAttribute('stroke', 'rgba(255, 255, 0, 0.7)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '5,5');
      svg.appendChild(line);
    }
    
    lineOverlayRef.current.appendChild(svg);
  }, []);
  
  // Create or update the info overlay
  const updateInfoOverlay = useCallback((point1, point2 = null, distance = null) => {
    if (!viewerRef.current) {
      viewerRef.current = document.querySelector('.viewer-panel');
    }
    
    if (!viewerRef.current) return;
    
    // Create info overlay if it doesn't exist
    if (!overlayRef.current) {
      const overlay = document.createElement('div');
      overlay.id = 'dc-info-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '20px';
      overlay.style.left = '20px';
      overlay.style.background = 'rgba(0, 0, 0, 0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px';
      overlay.style.borderRadius = '4px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.zIndex = '1001';
      overlay.style.pointerEvents = 'none';
      
      document.body.appendChild(overlay);
      overlayRef.current = overlay;
    }
    
    // Build content
    let content = `<div style="margin-bottom: 8px; font-weight: bold;">Distance Measurement</div>`;
    
    content += `<div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">`;
    
    // Point 1 info
    content += `<div>Point 1:</div>`;
    content += `<div>`;
    content += `x: ${point1.x.toFixed(2)}, y: ${point1.y.toFixed(2)}`;
    if (point1.hasWCS) {
      content += `<div>RA: ${point1.ra.toFixed(6)}°, Dec: ${point1.dec.toFixed(6)}°</div>`;
    }
    content += `</div>`;
    
    // Point 2 info
    if (point2) {
      content += `<div>Point 2:</div>`;
      content += `<div>`;
      content += `x: ${point2.x.toFixed(2)}, y: ${point2.y.toFixed(2)}`;
      if (point2.hasWCS) {
        content += `<div>RA: ${point2.ra.toFixed(6)}°, Dec: ${point2.dec.toFixed(6)}°</div>`;
      }
      content += `</div>`;
      
      // Distance info
      if (distance) {
        content += `<div>Distance:</div>`;
        content += `<div>`;
        content += `${distance.pixelDistance.toFixed(2)} pixels`;
        if (distance.skyDistance) {
          content += `<div>${distance.formattedSkyDistance}</div>`;
        }
        content += `</div>`;
      }
    }
    
    content += `</div>`;
    
    // Add footer
    if (point2) {
      content += `<div style="margin-top: 8px; font-size: 0.8em; opacity: 0.7;">`;
      content += copied ? "✓ Copied to clipboard!" : "Press ESC to exit.";
      content += `</div>`;
    } else {
      content += `<div style="margin-top: 8px; font-size: 0.8em; opacity: 0.7;">`;
      content += `Press '2' to set second point`;
      content += `</div>`;
    }
    
    // Update content
    overlayRef.current.innerHTML = content;
  }, [copied]);
  
  // Copy results to clipboard
  const copyResultToClipboard = useCallback((point1, point2, result) => {
    const clipboardData = {
      point1: {
        x: point1.x,
        y: point1.y,
        ra: point1.ra,
        dec: point1.dec
      },
      point2: {
        x: point2.x,
        y: point2.y,
        ra: point2.ra,
        dec: point2.dec
      },
      distance: {
        pixels: result.pixelDistance,
        sky: result.skyDistance,
        formatted: result.formattedSkyDistance
      }
    };
    
    navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2))
      .then(() => {
        console.log('Measurement copied to clipboard');
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(err => console.error('Could not copy to clipboard:', err));
  }, []);
  
  // Update visuals based on plugin state
  useEffect(() => {
    const pluginState = getPluginState(pluginId);
    if (!pluginState) {
      cleanupDOMElements();
      return;
    }
    
    if (pluginState.point1) {
      // Update line overlay
      updateLineOverlay(pluginState.point1, pluginState.point2);
      
      // Update info overlay
      updateInfoOverlay(pluginState.point1, pluginState.point2, result);
    }
  }, [
    pluginId, getPluginState, cleanupDOMElements, 
    updateLineOverlay, updateInfoOverlay, result
  ]);
  
  // Handle key presses
  const handleKeyPress = useCallback((e) => {
    if (e.key === '1') {
      const cursor = getCursor();
      if (!cursor?.isInBounds) return;
      
      // If plugin isn't active, activate it
      if (!isPluginActive(pluginId)) {
        activatePlugin(pluginId, {
          point1: {
            x: cursor.imageX,
            y: cursor.imageY,
            ra: cursor.ra,
            dec: cursor.dec,
            hasWCS: !!cursor.ra
          },
          point2: null
        });
      } else {
        // Update point1
        updatePluginState(pluginId, state => ({
          ...state,
          point1: {
            x: cursor.imageX,
            y: cursor.imageY,
            ra: cursor.ra,
            dec: cursor.dec,
            hasWCS: !!cursor.ra
          },
          point2: null
        }));
      }
      
      // Reset result
      setResult(null);
      setCopied(false);
    }
    else if (e.key === '2') {
      if (!isPluginActive(pluginId)) return;
      
      const pluginState = getPluginState(pluginId);
      if (!pluginState?.point1) return;
      
      const cursor = getCursor();
      if (!cursor?.isInBounds) return;
      
      // Set point2
      const point2 = {
        x: cursor.imageX,
        y: cursor.imageY,
        ra: cursor.ra,
        dec: cursor.dec,
        hasWCS: !!cursor.ra
      };
      
      updatePluginState(pluginId, state => ({
        ...state,
        point2
      }));
      
      // Calculate result
      const newResult = calculateDistance(pluginState.point1, point2);
      setResult(newResult);
      
      // Copy to clipboard
      copyResultToClipboard(pluginState.point1, point2, newResult);
    }
    else if (e.key === 'Escape') {
      if (isPluginActive(pluginId)) {
        deactivatePlugin(pluginId);
        setResult(null);
        setCopied(false);
        cleanupDOMElements();
      }
    }
  }, [
    pluginId, activatePlugin, deactivatePlugin, cleanupDOMElements,
    updatePluginState, getPluginState, isPluginActive, 
    getCursor, calculateDistance, copyResultToClipboard
  ]);
  
  // Set up key event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupDOMElements();
    };
  }, [cleanupDOMElements]);
  
  // Render nothing - all rendering is done directly via DOM
  return null;
}

export default DistanceCalculatorPlugin;
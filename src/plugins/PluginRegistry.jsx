// plugins/PluginRegistry.jsx
import React from 'react';
import { usePlugins } from '../contexts/PluginContext';

// Import all plugin components and their metadata
// import DistanceCalculatorPlugin, { pluginMetadata as distanceMetadata } from './DistanceCalculatorPlugin';
import MinimalDistancePlugin, { pluginMetadata as minimalDistanceMetadata } from './MinimalDistancePlugin';
// Import additional plugins as they are created

// List of all available plugins
const availablePlugins = [
  // {
  //   id: distanceMetadata.id,
  //   component: DistanceCalculatorPlugin,
  //   metadata: distanceMetadata
  // },
  {
    id: minimalDistanceMetadata.id,
    component: MinimalDistancePlugin,
    metadata: minimalDistanceMetadata
  },
  // Add more plugins here
];

// Component to render all active plugins
export function PluginRenderer() {
  return (
    <>
      {availablePlugins.map(plugin => (
        <plugin.component key={plugin.id} />
      ))}
    </>
  );
}

// Component to display and manage available plugins (for a potential future plugin manager UI)
export function PluginManager() {
  const { activePlugins, activatePlugin, deactivatePlugin } = usePlugins();
  
  return (
    <div className="plugin-manager">
      <h3>Available Plugins</h3>
      <ul>
        {availablePlugins.map(plugin => (
          <li key={plugin.id}>
            <div className="plugin-item">
              <span>{plugin.metadata.name}</span>
              <button
                onClick={() => 
                  activePlugins[plugin.id] 
                    ? deactivatePlugin(plugin.id)
                    : activatePlugin(plugin.id)
                }
              >
                {activePlugins[plugin.id] ? 'Deactivate' : 'Activate'}
              </button>
            </div>
            <div className="plugin-description">
              {plugin.metadata.description}
              {plugin.metadata.keybindings?.length > 0 && (
                <div className="plugin-keybindings">
                  Keys: {plugin.metadata.keybindings.join(', ')}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
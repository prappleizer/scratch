// App.jsx with Plugin Registry
import React from 'react';
import useFitsStore from './fitsStore';
import TopNav from './components/TopNav/TopNav';
import Sidebar from './components/Sidebar/Sidebar';
import ViewerPanel from './components/ViewerPanel';
import { CursorProvider } from './contexts/CursorContext';
import { ImageTransformProvider } from './contexts/ImageTransformContext';
import { PluginProvider } from './contexts/PluginContext';
import { PluginRenderer } from './plugins/PluginRegistry';
import './App.css';

function App() {
  const { status, image } = useFitsStore();

  return (
    <CursorProvider>
      <ImageTransformProvider>
        <PluginProvider>
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopNav />
            <div className="main-container">
              <div className="viewer">
                {image?.halfFloatData && image?.stats
                  ? <ViewerPanel />
                  : <div><img width="50px" src="/mothra-logo-light.png"/></div>}
              </div>
              <Sidebar />
            </div>
            
            {/* Render all active plugins */}
            <PluginRenderer />
            
            {status.isLoading && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'white', background: '#333', padding: '0.5rem', borderRadius: '4px' }}>
                Loading FITS file...
              </div>
            )}
          </div>
        </PluginProvider>
      </ImageTransformProvider>
    </CursorProvider>
  );
}

export default App;
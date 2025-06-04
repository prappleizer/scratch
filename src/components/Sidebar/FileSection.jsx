import React, { useState } from 'react';
import useFitsStore from '../../fitsStore';
import DropdownWrapper from './DropdownWrapper';
import HeaderModal from '../Modals/HeaderModal';

export default function FileSection() {
  const { file } = useFitsStore();
  const [showHeader, setShowHeader] = useState(false);
  
  return (
    <DropdownWrapper title="File">
      {file.name ? (
        <div>
          <div><b>File:</b> {file.name}</div>
          <button 
            onClick={() => setShowHeader(true)}
            style={{ 
              marginTop: '0.5rem', 
              padding: '0.3rem 0.8rem',
              fontSize: '0.9rem'
            }}
          >
            View Header
          </button>
          
          {showHeader && (
            <HeaderModal 
              header={file.header} 
              headerText={file.headerText}
              onClose={() => setShowHeader(false)} 
            />
          )}
        </div>
      ) : (
        <div style={{ fontStyle: 'italic', color: '#888' }}>No file loaded</div>
      )}
    </DropdownWrapper>
  );
}
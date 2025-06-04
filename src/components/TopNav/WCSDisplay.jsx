// WCSDisplay.jsx
import React from 'react';
import { useCursor } from '../../contexts/CursorContext';

const WCSDisplay = () => {
  // Get cursor directly from context
  const cursor = useCursor();
  
  // Only display coordinates if we have them
  const hasCoordinates = cursor?.raSex && cursor?.decSex;
  
  return (
    <div className="wcs-display">
      <div className="wcs-coordinates">
        {hasCoordinates ? (
          <>
            {cursor.raSex} {cursor.decSex}
            {cursor.raDeg && cursor.decDeg && ` | ${cursor.raDeg} ${cursor.decDeg}`}
          </>
        ) : (
          ''
        )}
      </div>
    </div>
  );
};

export default WCSDisplay;
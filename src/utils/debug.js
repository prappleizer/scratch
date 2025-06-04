// Can be pasted into viewer to trigger corner dots 
// add  {renderImageCornerMarkers()} in return 
const renderImageCornerMarkers = () => {
    const image = useFitsStore(state => state.image);
    if (!image?.width || !image?.height || !containerRef.current) return null;
    
    // Define the four corners in image coordinates
    const imageCorners = [
      { x: 0, y: 0, color: 'blue', label: 'Bottom Left (DS9 1,1)' },
      { x: 0, y: image.height - 1, color: 'green', label: 'Top Left (DS9 1,height)' },
      { x: image.width - 1, y: 0, color: 'orange', label: 'Bottom Right (DS9 width,1)' },
      { x: image.width - 1, y: image.height - 1, color: 'red', label: 'Top Right (DS9 width,height)' }
    ];
    
    // Get container dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    
    return imageCorners.map((corner, index) => {
      // Step 1: Convert from image coordinates (0-indexed) to center-relative
      const imageCenterX = image.width / 2;
      const imageCenterY = image.height / 2;
      let relX = corner.x - imageCenterX;
      let relY = corner.y - imageCenterY;
      
      // Step 2: Apply transformations in the same order as the canvas
      
      // Apply flips
      if (transformState.flipHorizontal) {
        relX = -relX;
      }
      if (transformState.flipVertical) {
        relY = -relY;
      }
      
      // Apply rotation
      let rotatedX = relX;
      let rotatedY = relY;
      if (transformState.rotationAngle !== 0) {
        const radians = transformState.rotationAngle * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        if (transformState.flipHorizontal) {
    
            rotatedX = relX* cos + relY * sin;
            rotatedY = -relX * sin + relY * cos;
          } else {

            rotatedX = relX * cos - relY * sin;
            rotatedY = relX* sin + relY * cos;
          }
        
      }
      
      // Apply scale
      const scaledX = rotatedX * transformState.scale;
      const scaledY = rotatedY * transformState.scale;
      
      // Apply pan offset
      const finalX = scaledX + transformState.offset.x + containerCenterX;
      const finalY = scaledY + transformState.offset.y + containerCenterY;
      
      // Render a dot at the calculated screen position
      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${finalX - 5}px`,
            top: `${finalY - 5}px`,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: corner.color,
            border: '2px solid white',
            zIndex: 2000,
            pointerEvents: 'none'
          }}
          title={corner.label}
        />
      );
    });
  };

  // can bee used to add asimple rotation slider for debug 
  // add <RotationSlider /> in return 
  const RotationSlider = () => {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px',
          borderRadius: '4px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '250px'
        }}
        // Stop propagation to prevent canvas dragging
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ minWidth: '120px' }}>Rotation: {transformState.rotationAngle.toFixed(1)}°</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={transformState.rotationAngle}
            onChange={(e) => setRotation(Number(e.target.value))}
            style={{ flex: 1 }}
            // Stop propagation on all relevant events
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFlipX();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: transformState.flipHorizontal ? '#4a90e2' : '#333',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              flex: 1
            }}
          >
            Flip Horizontal
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFlipY();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: transformState.flipVertical ? '#4a90e2' : '#333',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              flex: 1
            }}
          >
            Flip Vertical
          </button>
        </div>
      </div>
    );
  };

  // manual flip horizontal button
  <button 
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 1000,
            background: '#333',
            color: 'white',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px'
          }}
          onClick={() => toggleFlipX()}
        >
          Flip Horizontal
        </button>
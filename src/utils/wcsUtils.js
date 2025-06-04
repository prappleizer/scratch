// wcsUtils.js - Applying flip first, then calculating rotation
/**
 * Calculate the necessary transformations to orient an image with North up and East left
 * @param {Object} wcs - The WCS object from the FITS header
 * @returns {Object} Transformation parameters: {flipHorizontal, rotationAngle}
 */

const decimalToSexagesimal = (decimal, isRA = false) => {
    if (decimal === undefined || decimal === null) return '00:00:00.00';
  
    // Make sure the input is positive
    let value = Math.abs(decimal);
  
    // For RA: Convert degrees to hours (divide by 15)
    if (isRA) {
      value = value / 15;
    }
  
    // Calculate hours/degrees, minutes, seconds
    const degrees = Math.floor(value);
    const minutesDecimal = (value - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
  
    // Format with leading zeros
    const formattedDegrees = degrees.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = parseFloat(seconds).toFixed(2).padStart(5, '0');
  
    // Add sign for declination
    const sign = decimal < 0 && !isRA ? '-' : '';
  
    return `${sign}${formattedDegrees}:${formattedMinutes}:${formattedSeconds}`;
  };

  export function calculateWCSTransformations(wcs) {
    if (!wcs || !wcs.valid) {
      console.error('No valid WCS information available');
      return null;
    }
    
    // Extract the CD matrix elements (or PC matrix + CDELT)
    let cd1_1 = wcs.CD1_1 || (wcs.PC1_1 * wcs.CDELT1);
    let cd1_2 = wcs.CD1_2 || (wcs.PC1_2 * wcs.CDELT1);
    let cd2_1 = wcs.CD2_1 || (wcs.PC2_1 * wcs.CDELT2);
    let cd2_2 = wcs.CD2_2 || (wcs.PC2_2 * wcs.CDELT2);
    
    console.log('Original CD Matrix:', { cd1_1, cd1_2, cd2_1, cd2_2 });
    
    // Calculate determinant to check coordinate system handedness
    const det = cd1_1 * cd2_2 - cd1_2 * cd2_1;
    const needsFlip = det > 0; // Flip if determinant is positive
    
    // If we need to flip, transform the CD matrix to account for horizontal flip
    if (needsFlip) {
      // Apply horizontal flip to CD matrix (multiply first column by -1)
      cd1_1 = -cd1_1;
      cd2_1 = -cd2_1;
      
      console.log('CD Matrix after flip:', { cd1_1, cd1_2, cd2_1, cd2_2 });
    }
    
    // Now calculate the position angle of north with the (potentially flipped) matrix
    // North corresponds to the direction of increasing Dec (second row of CD matrix)
    const northAngle = Math.atan2(cd2_1, cd2_2);
    
    // Convert to degrees and normalize to 0-360 in ASTRONOMICAL convention (counterclockwise)
    let northAngleDeg = (northAngle * 180 / Math.PI) % 360;
    if (northAngleDeg < 0) northAngleDeg += 360;
    
    // Return in astronomical convention (counterclockwise rotation)
    console.log('WCS Transformation:', {
      northAngle: northAngleDeg,
      determinant: det,
      needsFlip,
      astronomical: true // Mark that this is in astronomical convention
    });
    
    return {
      flipHorizontal: needsFlip,
      rotationAngle: northAngleDeg // Counterclockwise
    };
  }

/**
 * Calculates celestial coordinates (RA/Dec) from image coordinates
 * @param {Object} cursor - The cursor object with imageX and imageY properties
 * @param {Object} wcs - The WCS object from the FITS header
 * @returns {Object} Extended cursor object with RA/Dec information
 */
export function calculateCelestialCoordinates(cursor, wcs) {
    
    // If no WCS or cursor not in bounds, return original cursor
    if (!wcs || !cursor || !cursor.isInBounds) {
      console.log("Early return - no WCS or cursor not in bounds");
      return {
        ...cursor,
        ra: null,
        dec: null,
        raSex: '',
        decSex: '',
        raDeg: '',
        decDeg: ''
      };
    }
    
    try {
      // Extract image coordinates
      const { imageX,imageY } = cursor;
      
      let ra, dec;
      
      // Try to convert pixel coordinates to world coordinates
      if (typeof wcs.pix2world === 'function') {
        const result = wcs.pix2world(imageX,imageY);
        
        if (result) {
          if (Array.isArray(result)) {
            [ra, dec] = result;
          } else if (typeof result === 'object') {
            ra = result.ra;
            dec = result.dec;
          }
        }
      } else if (wcs.pixToWorld) {
        const result = wcs.pixToWorld(imageX,imageY);
        
        if (result) {
          if (Array.isArray(result)) {
            [ra, dec] = result;
          } else if (typeof result === 'object') {
            ra = result.ra;
            dec = result.dec;
          }
        }
      }
      
      
      // If we have valid values, format them
      if (ra !== undefined && dec !== undefined) {
        const raSex = decimalToSexagesimal(ra, true);
        const decSex = decimalToSexagesimal(dec);
        const raDeg = ra.toFixed(6);
        const decDeg = dec.toFixed(6);
        
        
        return {
          ...cursor,
          ra,
          dec,
          raSex,
          decSex,
          raDeg,
          decDeg
        };
      }
    } catch (err) {
      console.error('Error converting coordinates:', err);
      console.error(err.stack); // Add stack trace for more info
    }
    
    console.log("Returning default values due to calculation failure");
    return {
      ...cursor,
      ra: null,
      dec: null,
      raSex: '',
      decSex: '',
      raDeg: '',
      decDeg: ''
    };
  }
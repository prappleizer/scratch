import React, { useRef, useEffect, useCallback,forwardRef  } from 'react';
import useFitsStore from '../fitsStore';
import * as d3 from 'd3-scale-chromatic';
import { rgb } from 'd3-color';
// Vertex shader with matrix transform support
const vertexSrc = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
uniform mat3 u_matrix;
out vec2 v_texCoord;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

// Simple fragment shader with normalization and LUT
const fragmentSrc = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_lut;
uniform float u_blackNorm;
uniform float u_whiteNorm;
uniform int u_scaleMode;
const float LOG_CONST = 1000.0;
const float SINH_CONST = 3.0;
void main() {
  float value = texture(u_image, v_texCoord).r;
  float range = max(0.00001, u_whiteNorm - u_blackNorm);
  float norm = (value - u_blackNorm) / range;

  // Apply the selected scale mode
  if (u_scaleMode == 1) {
    norm = sqrt(norm);
  } else if (u_scaleMode == 2) {
    norm = log(1.0 + norm * LOG_CONST) / log(1.0 + LOG_CONST);
  } else if (u_scaleMode == 3) {
    norm = asinh(norm * SINH_CONST) / asinh(SINH_CONST);
  }

  // 🔒 Clamp after scaling
  norm = clamp(norm, 0.0, 1.0);

  vec4 color = texture(u_lut, vec2(norm, 0.5));
  fragColor = color;
}`;

function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}


const WebGLCanvas = forwardRef(function WebGLCanvas(props, canvasRef) {
  //const canvasRef = useRef(null);
  const lutTexRef = useRef(null);
  const programRef = useRef(null); //
  const glContextRef = useRef(null); 
  //const transformRef = useRef({
  //  scale: 1,
  //  offset: { x: 0, y: 0 },
  //});
  
  const { halfFloatData, width, height, stats } = useFitsStore(state => state.image);
  const { black, white, colormap, reverse,scaleMode } = useFitsStore((s) => s.display);
  const setupGL = useCallback(() => {
      const canvas = canvasRef?.current;
      if (!canvas) return;
  
      // Get WebGL context and store it
      const gl = canvas.getContext('webgl2');
      if (!gl) return console.error('WebGL2 not supported');
      glContextRef.current = gl;
  
      // Resize canvas
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

    // Compile and link program
    const vShader = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
    const fShader = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vShader, fShader);
    gl.useProgram(program);
    programRef.current = program; 

    // Create full screen quad
    const vertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const aTex = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    // Upload image texture
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, width, height, 0, gl.RED, gl.HALF_FLOAT, halfFloatData);

    const uImage = gl.getUniformLocation(program, 'u_image');
    gl.uniform1i(uImage, 0);

    const uMatrix = gl.getUniformLocation(program, 'u_matrix');
    gl.uniformMatrix3fv(uMatrix, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]); // identity matrix

    const range = stats.rawMax - stats.rawMin;
    const b = Math.max(0, (stats.autoBlackPoint - stats.rawMin) / range);
    const w = Math.min(1, (stats.autoWhitePoint - stats.rawMin) / range);

    gl.uniform1f(gl.getUniformLocation(program, 'u_blackNorm'), b);
    gl.uniform1f(gl.getUniformLocation(program, 'u_whiteNorm'), w);
    gl.uniform1i(gl.getUniformLocation(program, 'u_scaleMode'), scaleMode);

    const lutFunc = d3[`interpolate${colormap.charAt(0).toUpperCase()}${colormap.slice(1)}`];
    const lut = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      let t = i / 255;
      if (reverse) t = 1 - t;
      const { r, g, b } = rgb(lutFunc?.(t) ?? `rgb(${i},${i},${i})`);
      lut.set([r, g, b, 255], i * 4);
    }
    if (!lutTexRef.current) {
      lutTexRef.current = gl.createTexture();
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [halfFloatData, width, height, stats,scaleMode]);

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    
    const gl = glContextRef.current;
    const program = programRef.current;
    if (!gl || !program) return;
    
  
    const range = stats.rawMax - stats.rawMin;
    const bNorm = Math.max(0, Math.min(1, (black - stats.rawMin) / range));
    const wNorm = Math.max(bNorm + 1e-6, Math.min(1, (white - stats.rawMin) / range));
  
    const uBlack = gl.getUniformLocation(program, 'u_blackNorm');
    const uWhite = gl.getUniformLocation(program, 'u_whiteNorm');
    gl.useProgram(program);
    gl.uniform1f(uBlack, bNorm);
    gl.uniform1f(uWhite, wNorm);
  
    // LUT update
    const lutFunc = d3[`interpolate${colormap.charAt(0).toUpperCase()}${colormap.slice(1)}`];
    const lut = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      let t = i / 255;
      if (reverse) t = 1 - t;
      const { r, g, b } = rgb(lutFunc?.(t) ?? `rgb(${i},${i},${i})`);
      lut.set([r, g, b, 255], i * 4);
    }
  
    if (!lutTexRef.current) {
      lutTexRef.current = gl.createTexture();
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);
  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [black, white, colormap, reverse, stats,scaleMode]);
  

  useEffect(() => {
    setupGL();
    
    // Cleanup function - properly clean up WebGL resources
    return () => {
      // Only delete resources if we have a valid GL context
      if (glContextRef.current) {
        const gl = glContextRef.current;
        
        // Check if the texture exists and the context is valid
        if (lutTexRef.current && gl.isTexture(lutTexRef.current)) {
          try {
            gl.deleteTexture(lutTexRef.current);
          } catch (err) {
            console.warn("Error deleting texture:", err);
          }
        }
        
        // Clean up the program if it exists
        if (programRef.current && gl.isProgram(programRef.current)) {
          try {
            gl.deleteProgram(programRef.current);
          } catch (err) {
            console.warn("Error deleting program:", err);
          }
        }
        
        // Clear references
        lutTexRef.current = null;
        programRef.current = null;
        glContextRef.current = null;
      }
    };
  }, [setupGL]);
  

  
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      tabIndex={0}
      style={{
        display: 'block',
        background: '#111',
        imageRendering: 'pixelated',
        // Remove maxWidth and maxHeight constraints
      }}
    />
  );
});

export default WebGLCanvas;


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface FractalCanvasProps {
  zoom: number;
  centerX: number;
  centerY: number;
  palette: number;
  audioData: { bass: number; mid: number; treble: number; avg: number } | null;
  onResize: (width: number, height: number) => void;
}

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 resolution;
  uniform vec2 center_high;
  uniform vec2 center_low;
  uniform float zoom;
  uniform float time;
  uniform float bass;
  uniform float mid;
  uniform float treble;
  uniform float avg;
  uniform int palette;

  vec3 hsb2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }

  void main() {
    // 2x2 Supersampling for smooth edges
    vec3 totalColor = vec3(0.0);
    float dpr = resolution.x / (resolution.x / (resolution.x > resolution.y ? resolution.x : resolution.y)); // rough proxy
    
    for(int m=0; m<2; m++) {
      for(int n=0; n<2; n++) {
        vec2 jitter = vec2(float(m), float(n)) * 0.5;
        vec2 uv = (gl_FragCoord.xy + jitter - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
        
        // Use split-coordinate arithmetic for higher precision
        float pulse = 1.0 + bass * 0.05;
        vec2 offset = uv / (zoom * pulse);
        vec2 c = center_high + (center_low + offset);

        vec2 z = vec2(0.0);
        float iter = 0.0;
        
        // Deeper iterations for deep zoom
        float maxIter = 256.0 + log2(zoom + 1.0) * 80.0;
        if (maxIter > 2500.0) maxIter = 2500.0; 

        for (float i = 0.0; i < 2500.0; i++) {
          if (i >= maxIter) break;
          z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
          if (dot(z, z) > 64.0) break;
          iter++;
        }

        if (iter >= maxIter - 1.0) {
          totalColor += vec3(0.0);
        } else {
          // Smooth coloring (Renormalization)
          float zn = sqrt(dot(z, z));
          float nu = log(log(zn) / log(2.0)) / log(2.0);
          float smoothIter = iter + 1.0 - nu;

          float hueOffset = 0.0;
          float satBase = 0.7;
          
          if (palette == 1) hueOffset = 0.05;
          else if (palette == 2) hueOffset = 0.6;
          else if (palette == 3) hueOffset = 0.33;
          else if (palette == 4) satBase = 0.0;

          float hue = fract(smoothIter * 0.008 + time * 0.05 + avg * 0.2 + hueOffset);
          float sat = satBase + mid * 0.2;
          float val = 0.6 + bass * 0.4;
          
          vec3 color = hsb2rgb(vec3(hue, sat, val));
          color += (1.0 - (iter / maxIter)) * 0.15 * treble;
          totalColor += color;
        }
      }
    }
    
    gl_FragColor = vec4(totalColor / 4.0, 1.0);
  }
`;

export default function FractalCanvas({ zoom, centerX, centerY, palette, audioData, onResize }: FractalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, precision: 'highp' });
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs!);
    gl.attachShader(program, fs!);
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      onResize(innerWidth, innerHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (time: number) => {
      if (!gl || !program) return;
      
      const resLoc = gl.getUniformLocation(program, 'resolution');
      const highLoc = gl.getUniformLocation(program, 'center_high');
      const lowLoc = gl.getUniformLocation(program, 'center_low');
      const zoomLoc = gl.getUniformLocation(program, 'zoom');
      const timeLoc = gl.getUniformLocation(program, 'time');
      const bassLoc = gl.getUniformLocation(program, 'bass');
      const midLoc = gl.getUniformLocation(program, 'mid');
      const trebleLoc = gl.getUniformLocation(program, 'treble');
      const avgLoc = gl.getUniformLocation(program, 'avg');
      const paletteLoc = gl.getUniformLocation(program, 'palette');

      // Split coordinates logic for 64-bit emulation in shader
      const split = (val: number) => {
        const high = Math.fround(val);
        const low = val - high;
        return [high, low];
      };

      const [xh, xl] = split(centerX);
      const [yh, yl] = split(centerY);

      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(highLoc, xh, yh);
      gl.uniform2f(lowLoc, xl, yl);
      gl.uniform1f(zoomLoc, zoom);
      gl.uniform1f(timeLoc, time * 0.001);
      gl.uniform1f(bassLoc, audioData?.bass || 0);
      gl.uniform1f(midLoc, audioData?.mid || 0);
      gl.uniform1f(trebleLoc, audioData?.treble || 0);
      gl.uniform1f(avgLoc, audioData?.avg || 0);
      gl.uniform1i(paletteLoc, palette);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [centerX, centerY, zoom, audioData, palette, onResize]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full cursor-crosshair" />;
}


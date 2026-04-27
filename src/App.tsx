/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent, MouseEvent, WheelEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Upload, Maximize2, MousePointer2, 
  Music, Settings2, Info, Github, Volume2, ZoomIn, 
  Zap, Share2, Compass, RotateCcw
} from 'lucide-react';
import { audioEngine } from './lib/audio';
import FractalCanvas from './components/FractalCanvas';

export default function App() {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: -0.5, y: 0 });
  const [palette, setPalette] = useState(0);
  const [audioData, setAudioData] = useState<{ bass: number; mid: number; treble: number; avg: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoZoom, setIsAutoZoom] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasSize = useRef({ width: window.innerWidth, height: window.innerHeight });

  const PRESETS = [
    { name: 'Hyper_DNB', genre: 'DNB', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73420.mp3' },
    { name: 'Cyber_House', genre: 'House', url: 'https://cdn.pixabay.com/audio/2021/11/23/audio_0396409559.mp3' },
    { name: 'Classical_Glitch', genre: 'Classic', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_19f390038c.mp3' },
    { name: 'Binary_Rock', genre: 'Rock', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3' },
  ];

  const PALETTES = [
    { name: 'Aether', color: 'from-pink-500 to-violet-600' },
    { name: 'Solar', color: 'from-orange-400 to-red-600' },
    { name: 'Deep Sea', color: 'from-blue-400 to-indigo-600' },
    { name: 'Emerald', color: 'from-emerald-400 to-green-600' },
    { name: 'Monochrome', color: 'from-gray-400 to-gray-800' },
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioEngine.init(audioRef.current);
    }
    
    let frame: number;
    const update = () => {
      const data = audioEngine.getFrequencyData();
      setAudioData(data);
      
      if (isAutoZoom && data && isPlaying) {
        // Target Seahorse Valley for interesting zoom
        const targetX = -0.743643887037151;
        const targetY = 0.13182590420533;
        
        setCenter(prev => ({
          x: prev.x + (targetX - prev.x) * 0.05,
          y: prev.y + (targetY - prev.y) * 0.05
        }));
        setZoom(prev => prev * (1 + data.bass * 0.03 + 0.005));
      }
      
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isAutoZoom, isPlaying]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioEngine.resume();
      setFileName(file.name);
      await audioEngine.loadTrack(file);
      setIsPlaying(true);
      audioRef.current?.play();
    }
  };

  const handlePresetSelect = async (preset: typeof PRESETS[0]) => {
    audioEngine.resume();
    setFileName(preset.name);
    await audioEngine.loadUrl(preset.url);
    setIsPlaying(true);
    audioRef.current?.play();
    setShowPresets(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioEngine.resume();
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => prev * factor);
  };

  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    const aspect = canvasSize.current.width / canvasSize.current.height;
    const sensitivity = 2.0 / (zoom * Math.min(canvasSize.current.width, canvasSize.current.height));
    
    setCenter(prev => ({
      x: prev.x - dx * sensitivity,
      y: prev.y + dy * sensitivity
    }));
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div 
      className="fixed inset-0 bg-[#08080c] text-white font-sans overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <FractalCanvas 
        zoom={zoom}
        centerX={center.x}
        centerY={center.y}
        palette={palette}
        audioData={audioData}
        onResize={(w, h) => { canvasSize.current = { width: w, height: h }; }}
      />

      {/* Audio Element Hidden */}
      <audio ref={audioRef} crossOrigin="anonymous" onEnded={() => setIsPlaying(false)} />

      {/* Immersive HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-20">
        
        {/* Top Navbar */}
          <nav className="flex justify-between items-center pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-sm rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 border border-white/40 rounded-sm"></div>
              </div>
              <span className="text-xl font-bold tracking-tighter uppercase italic">Aether // Engine</span>
            </div>
            <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-medium text-white/50 relative">
              <span className="text-white border-b border-pink-500 pb-1 cursor-default">Visualizer</span>
              <button 
                onClick={() => setShowPresets(!showPresets)}
                className={`hover:text-white transition-colors cursor-pointer ${showPresets ? 'text-white' : ''}`}
              >
                Presets
              </button>
              
              <AnimatePresence>
                {showPresets && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-8 right-0 bg-[#151619]/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 w-48 shadow-2xl z-50 overflow-hidden"
                  >
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                      >
                        <p className="text-[10px] font-bold text-white group-hover:text-pink-400">{preset.name}</p>
                        <p className="text-[8px] text-white/40 uppercase">{preset.genre}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="hover:text-white transition-colors cursor-pointer">About</span>
            </div>
          </nav>

        <div className="flex justify-between items-center flex-1 py-12">
          {/* Left HUD: Coordinates & Telemetry */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pointer-events-auto"
          >
            <div className="space-y-1">
              <p className="text-[10px] text-pink-500 font-mono uppercase tracking-widest">Coordinates</p>
              <p className="text-sm font-mono text-white/80">X: {center.x.toFixed(12)}</p>
              <p className="text-sm font-mono text-white/80">Y: {center.y.toFixed(12)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">Magnification</p>
              <p className="text-4xl font-light italic tracking-tight">{zoom.toExponential(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Signal Status</p>
              <p className="text-lg font-mono text-white/80 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {isPlaying ? 'ACTIVE' : 'IDLE'}
              </p>
            </div>
          </motion.div>

          {/* Right Sidebar: Quick Controls */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 space-y-4 pointer-events-auto"
          >
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl space-y-6">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/60">Auto-Navigator</span>
                  <span className={`text-xs font-mono ${isAutoZoom ? 'text-pink-400' : 'text-white/20'}`}>
                    {isAutoZoom ? 'ENGAGED' : 'OFF'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsAutoZoom(!isAutoZoom)}
                  className={`w-full h-8 rounded border transition-all ${isAutoZoom ? 'bg-pink-500/20 border-pink-500' : 'bg-white/5 border-white/10'}`}
                >
                  <div className={`h-full bg-pink-500 transition-all duration-500`} style={{ width: isAutoZoom ? '100%' : '0%' }} />
                </button>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-white/60 block mb-3">Aura Palette</span>
                <div className="flex gap-2">
                  {PALETTES.map((p, i) => (
                    <button
                      key={p.name}
                      onClick={() => setPalette(i)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.color} border-2 transition-all ${palette === i ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setZoom(1); setCenter({ x: -0.5, y: 0 }); setIsAutoZoom(false); }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors gap-1"
                >
                  <RotateCcw className="w-4 h-4 text-white/60" />
                  <span className="text-[8px] uppercase tracking-widest font-bold">Reset</span>
                </button>
                <button 
                  onClick={() => setShowControls(!showControls)}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors gap-1"
                >
                  <Maximize2 className="w-4 h-4 text-white/60" />
                  <span className="text-[8px] uppercase tracking-widest font-bold">Clear UI</span>
                </button>
              </div>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-pink-500 hover:text-white transition-colors"
              >
                Change Signal
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Audio Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full h-24 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl flex items-center px-8 pointer-events-auto"
        >
          <div className="flex items-center gap-6 w-1/3">
            <button 
              onClick={togglePlay}
              className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-pink-500/20 hover:border-pink-500 transition-all group"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              ) : (
                <Play className="w-6 h-6 text-white translate-x-0.5 group-hover:scale-110 transition-transform" />
              )}
            </button>
            <div className="overflow-hidden">
              <p className="text-xs font-bold tracking-wide truncate">{fileName || 'NO_SIGNAL_DETECTED'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tight">Audio Analysis • {isPlaying ? 'Streaming' : 'Paused'}</p>
            </div>
          </div>
          
          {/* Waveform Visualizer */}
          <div className="flex-1 h-12 flex items-center justify-center gap-1.5 px-12 opacity-80">
            {[...Array(24)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  height: audioData 
                    ? `${Math.max(4, (i % 3 === 0 ? audioData.bass : i % 2 === 0 ? audioData.mid : audioData.treble) * 48 + Math.random() * 8)}px` 
                    : '4px',
                  backgroundColor: audioData && i % 3 === 0 ? '#ec4899' : 'rgba(255,255,255,0.2)'
                }}
                className="w-[3px] rounded-full transition-colors duration-100"
              />
            ))}
          </div>

          <div className="w-1/3 flex justify-end">
            <label className="flex items-center gap-3 px-6 py-3 bg-white/10 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <span className="text-[10px] font-bold uppercase tracking-widest">Upload Track</span>
            </label>
          </div>
        </motion.div>
      </div>

      {/* Initial Landing Overlay */}
      <AnimatePresence>
        {!isPlaying && !fileName && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#08080c]/80 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-6 max-w-md p-12"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-2xl rotate-45 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                <Music className="w-10 h-10 text-white -rotate-45" />
              </div>
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic">AuraFractal</h2>
              <p className="text-xs text-white/40 leading-relaxed tracking-widest uppercase">
                Synchronized Neural Geometry. <br/> Initialize via neural presets or custom signal.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    audioEngine.resume();
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-10 py-4 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-pink-500 hover:text-white transition-all transform hover:scale-105"
                >
                  Connect Custom Signal
                </button>

                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => handlePresetSelect(p)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] uppercase font-bold tracking-widest hover:bg-white/10 hover:border-pink-500 transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle UI Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.9)] z-10"></div>
    </div>
  );
}

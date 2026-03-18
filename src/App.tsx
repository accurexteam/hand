import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { HandTracker } from './components/HandTracker';
import { Scene3D } from './components/Scene3D';
import { HologramUI } from './components/HologramUI';
import { useStore } from './store/useStore';
import { OrbitControls } from '@react-three/drei';

export default function App() {
  const mode = useStore((state) => state.mode);
  const isDebug = useStore((state) => state.isDebug);
  const toggleDebug = useStore((state) => state.toggleDebug);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative font-sans text-white">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene3D />
          </Suspense>
          {/* Allow mouse control as fallback/debug */}
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* 2D Hologram UI */}
      <HologramUI />

      {/* Hand Tracker (Webcam Feed) */}
      <HandTracker />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none z-30 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
            HOLO<span className="text-white">HAND</span>
          </h1>
          <p className="text-cyan-500/80 font-mono text-sm mt-1">GESTURE CONTROL SYSTEM v1.0</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'object' ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_#00ffff]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">OBJECT</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'break' ? 'bg-purple-400 animate-pulse shadow-[0_0_10px_#a855f7]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">BREAK</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'ui' ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">UI</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'summon' ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_#facc15]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">SUMMON</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'demon' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">DEMON</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full ${mode === 'portal' ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]' : 'bg-cyan-900'}`} />
              <span className="font-mono text-xs text-cyan-100">PORTAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions HUD */}
      <div className="absolute bottom-6 left-6 pointer-events-none z-30 bg-black/40 border border-cyan-500/30 p-4 rounded-xl backdrop-blur-md">
        <h3 className="text-cyan-400 font-mono text-sm mb-2 border-b border-cyan-500/30 pb-1 flex justify-between">
          <span>GESTURE COMMANDS</span>
          <button 
            onClick={toggleDebug} 
            className="pointer-events-auto text-[10px] bg-cyan-900/50 px-2 py-0.5 rounded hover:bg-cyan-800 transition-colors"
          >
            DEBUG: {isDebug ? 'ON' : 'OFF'}
          </button>
        </h3>
        <ul className="text-cyan-100/70 font-mono text-[11px] space-y-1.5">
          <li><span className="text-cyan-300">PINCH</span> : Drag object / Move UI panels</li>
          <li><span className="text-cyan-300">TWO-HAND PINCH</span> : Scale & Rotate object</li>
          <li><span className="text-cyan-300">OPEN PALM (Hold)</span> : Activate Break Mode</li>
          <li><span className="text-cyan-300">CLOSED FIST</span> : Reset to Object Mode</li>
          <li><span className="text-cyan-300">DOUBLE OPEN PALM</span> : Activate Hologram UI</li>
          <li className="pt-1 border-t border-cyan-500/20 mt-1"><span className="text-yellow-400">OPEN PALM → FIST</span> : Summon Object</li>
          <li><span className="text-red-400">DOUBLE PEACE SIGN</span> : Summon Demon</li>
          <li><span className="text-blue-400">POINT FORWARD (Fast)</span> : Open Portal</li>
        </ul>
      </div>
    </div>
  );
}

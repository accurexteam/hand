import { create } from 'zustand';
import * as THREE from 'three';

export type GestureType = 'none' | 'pinch' | 'open_palm' | 'closed_fist' | 'swipe_left' | 'swipe_right' | 'double_open' | 'pointing' | 'peace';

export type AppMode = 'object' | 'break' | 'ui' | 'summon' | 'demon' | 'portal';

interface HandData {
  isDetected: boolean;
  position: THREE.Vector3; // Normalized 3D position
  screenPosition: { x: number; y: number }; // 2D screen position
  rawLandmarks: any[]; // MediaPipe landmarks
  gesture: GestureType;
  handedness: 'Left' | 'Right' | 'Unknown';
  velocity?: THREE.Vector3;
}

export interface SceneObject {
  id: string;
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  type: 'cube' | 'sphere' | 'torus' | 'demon';
  color: string;
}

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
  hands: HandData[];
  setHands: (hands: HandData[]) => void;
  
  // UI State
  panels: { id: string; title: string; position: { x: number; y: number }; isOpen: boolean }[];
  togglePanel: (id: string) => void;
  movePanel: (id: string, x: number, y: number) => void;
  
  // Objects State
  objects: SceneObject[];
  setObjects: (objects: SceneObject[]) => void;
  addObject: (obj: SceneObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  
  // Legacy Object State (Main Object)
  objectPosition: THREE.Vector3;
  setObjectPosition: (pos: THREE.Vector3) => void;
  objectScale: number;
  setObjectScale: (scale: number) => void;
  objectRotation: THREE.Euler;
  setObjectRotation: (rot: THREE.Euler) => void;
  isBroken: boolean;
  setIsBroken: (broken: boolean) => void;

  isDebug: boolean;
  toggleDebug: () => void;
}

export const playSound = (type: 'tap' | 'swipe' | 'magic' | 'error' | 'bass') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'magic') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'bass') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch (e) {}
};

export const useStore = create<AppState>((set) => ({
  mode: 'object',
  setMode: (mode) => {
    playSound('magic');
    set({ mode });
  },
  
  hands: [],
  setHands: (hands) => set({ hands }),
  
  panels: [
    { id: 'sys', title: 'SYSTEM STATUS', position: { x: 100, y: 100 }, isOpen: false },
    { id: 'nav', title: 'NAVIGATION', position: { x: 100, y: 300 }, isOpen: false },
    { id: 'data', title: 'DATA STREAM', position: { x: 100, y: 500 }, isOpen: false },
  ],
  togglePanel: (id) => {
    playSound('tap');
    set((state) => ({
      panels: state.panels.map(p => p.id === id ? { ...p, isOpen: !p.isOpen } : p)
    }));
  },
  movePanel: (id, x, y) => set((state) => ({
    panels: state.panels.map(p => p.id === id ? { ...p, position: { x, y } } : p)
  })),
  
  objects: [],
  setObjects: (objects) => set({ objects }),
  addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
  removeObject: (id) => set((state) => ({ objects: state.objects.filter(o => o.id !== id) })),
  updateObject: (id, updates) => set((state) => ({
    objects: state.objects.map(o => o.id === id ? { ...o, ...updates } : o)
  })),

  objectPosition: new THREE.Vector3(0, 0, 0),
  setObjectPosition: (pos) => set({ objectPosition: pos }),
  objectScale: 1,
  setObjectScale: (scale) => set({ objectScale: scale }),
  objectRotation: new THREE.Euler(0, 0, 0),
  setObjectRotation: (rot) => set({ objectRotation: rot }),
  isBroken: false,
  setIsBroken: (broken) => set({ isBroken: broken }),

  isDebug: false,
  toggleDebug: () => set((state) => ({ isDebug: !state.isDebug })),
}));

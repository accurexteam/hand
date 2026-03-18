import React, { useEffect, useState, useRef } from 'react';
import { useStore, playSound } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Database, X } from 'lucide-react';

export function HologramUI() {
  const mode = useStore((state) => state.mode);
  const hands = useStore((state) => state.hands);
  const panels = useStore((state) => state.panels);
  const movePanel = useStore((state) => state.movePanel);
  const togglePanel = useStore((state) => state.togglePanel);

  const draggedPanelsRef = useRef<{ [handIndex: number]: string | null }>({ 0: null, 1: null });

  // Refs to store panel dimensions for collision detection
  const panelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (mode !== 'ui' || hands.length === 0) {
      draggedPanelsRef.current = { 0: null, 1: null };
      return;
    }

    hands.forEach((hand, index) => {
      if (!hand || !hand.isDetected) {
        draggedPanelsRef.current[index] = null;
        return;
      }

      const x = hand.screenPosition.x * window.innerWidth;
      const y = hand.screenPosition.y * window.innerHeight;

      if (hand.gesture === 'pinch') {
        const draggedPanel = draggedPanelsRef.current[index];
        if (draggedPanel) {
          // Continue dragging
          movePanel(draggedPanel, x - 144, y - 96); // Offset to center of panel
        } else {
          // Check for collision to start dragging
          for (const panel of panels) {
            // Prevent grabbing a panel already grabbed by the other hand
            const isGrabbedByOther = Object.entries(draggedPanelsRef.current)
              .some(([idx, pId]) => pId === panel.id && parseInt(idx) !== index);
            if (isGrabbedByOther) continue;

            const el = panelRefs.current[panel.id];
            if (el) {
              const rect = el.getBoundingClientRect();
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                draggedPanelsRef.current[index] = panel.id;
                playSound('tap');
                break;
              }
            }
          }
        }
      } else {
        // Release drag
        draggedPanelsRef.current[index] = null;
      }
    });
  }, [hands, mode]); // Removed panels from deps to avoid infinite loop during drag

  // Auto-open panels when entering UI mode
  useEffect(() => {
    if (mode === 'ui') {
      panels.forEach(p => {
        if (!p.isOpen) togglePanel(p.id);
      });
    }
  }, [mode]);

  if (mode !== 'ui') return null;

  const getIcon = (id: string) => {
    switch (id) {
      case 'sys': return <Cpu className="w-5 h-5 text-cyan-400" />;
      case 'nav': return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'data': return <Database className="w-5 h-5 text-cyan-400" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Holographic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      <AnimatePresence>
        {panels.map((panel) => panel.isOpen && (
          <motion.div
            key={panel.id}
            ref={(el) => (panelRefs.current[panel.id] = el)}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: panel.position.x, y: panel.position.y }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`absolute w-72 h-48 bg-black/40 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,255,255,0.2)] ${
              Object.values(draggedPanelsRef.current).includes(panel.id) ? 'ring-2 ring-cyan-400 shadow-[0_0_50px_rgba(0,255,255,0.5)]' : ''
            }`}
          >
            {/* Header */}
            <div className="h-10 border-b border-cyan-500/30 bg-cyan-950/50 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                {getIcon(panel.id)}
                <span className="text-cyan-400 font-mono text-sm tracking-wider">{panel.title}</span>
              </div>
              <button 
                onClick={() => togglePanel(panel.id)}
                className="text-cyan-500 hover:text-cyan-300 transition-colors pointer-events-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 font-mono text-xs text-cyan-100/70 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-900/20" />
              {panel.id === 'sys' && (
                <div className="space-y-2">
                  <div className="flex justify-between"><span>CPU LOAD</span><span className="text-cyan-400">{(Math.random() * 40 + 20).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span>MEM USAGE</span><span className="text-cyan-400">4.2 GB</span></div>
                  <div className="flex justify-between"><span>NET UPLINK</span><span className="text-cyan-400">STABLE</span></div>
                  <div className="w-full h-1 bg-cyan-950 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400"
                      animate={{ width: ['30%', '70%', '45%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
                    />
                  </div>
                </div>
              )}
              {panel.id === 'nav' && (
                <div className="h-full flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border border-cyan-500/30 flex items-center justify-center relative">
                    <div className="absolute inset-0 border border-cyan-400 rounded-full animate-ping opacity-20" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    <motion.div 
                      className="absolute w-full h-[1px] bg-cyan-400/50 origin-left"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              )}
              {panel.id === 'data' && (
                <div className="space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-2 opacity-70">
                      <span className="text-cyan-600">0x{Math.floor(Math.random() * 10000).toString(16).padStart(4, '0')}</span>
                      <span className="truncate">{Math.random().toString(36).substring(2, 15)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Custom Cursors for Hand Positions */}
      {hands.map((hand, i) => {
        if (!hand || !hand.isDetected) return null;
        const x = hand.screenPosition.x * window.innerWidth;
        const y = hand.screenPosition.y * window.innerHeight;
        return (
          <motion.div
            key={i}
            className="fixed w-8 h-8 rounded-full border-2 border-cyan-400 pointer-events-none z-50 flex items-center justify-center mix-blend-screen"
            animate={{
              x: x - 16,
              y: y - 16,
              scale: hand.gesture === 'pinch' ? 0.5 : 1,
              backgroundColor: hand.gesture === 'pinch' ? 'rgba(0, 255, 255, 0.5)' : 'transparent'
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
          >
            <div className="w-1 h-1 bg-cyan-400 rounded-full" />
          </motion.div>
        );
      })}
    </div>
  );
}

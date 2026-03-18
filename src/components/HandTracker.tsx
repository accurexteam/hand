import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../store/useStore';
import { detectGesture, smoothPosition } from '../lib/gestureDetector';
import * as THREE from 'three';

export function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const setHands = useStore((state) => state.setHands);
  const handsState = useStore((state) => state.hands);
  const setMode = useStore((state) => state.setMode);
  const setIsBroken = useStore((state) => state.setIsBroken);
  const isDebug = useStore((state) => state.isDebug);

  // Keep track of previous positions for smoothing
  const prevPositionsRef = useRef<Record<number, THREE.Vector3>>({});
  const velocitiesRef = useRef<Record<number, THREE.Vector3>>({});
  
  // Keep track of gesture history for mode switching
  const gestureHistoryRef = useRef<{ type: string; time: number }[]>([]);
  const lastModeSwitchTime = useRef<number>(0);

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;
    let lastVideoTime = -1;

    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        setIsLoaded(true);
        startCamera();
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
      }
    };

    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setPermissionDenied(true);
      }
    };

    const predictWebcam = () => {
      if (!videoRef.current || !canvasRef.current || !handLandmarker) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas size to video
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      let startTimeMs = performance.now();
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, startTimeMs);
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame (mirrored)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const newHands: any[] = [];
        
        if (results.landmarks) {
          for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const handedness = results.handednesses[i][0].categoryName;
            
            // Draw landmarks
            ctx.fillStyle = handedness === 'Left' ? '#00ff00' : '#00ffff';
            for (const landmark of landmarks) {
              ctx.beginPath();
              ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            }

            // Calculate 3D position (using index finger tip as primary interaction point)
            const indexTip = landmarks[8];
            // Map from [0, 1] to [-10, 10] for 3D scene
            // Note: X is inverted because webcam is mirrored
            const targetPos = new THREE.Vector3(
              (0.5 - indexTip.x) * 20,
              (0.5 - indexTip.y) * 15,
              -indexTip.z * 10 // Depth
            );

            // Smooth position
            let currentPos = prevPositionsRef.current[i] || targetPos;
            currentPos = smoothPosition(currentPos, targetPos, 0.3);
            
            // Calculate velocity
            const velocity = currentPos.clone().sub(prevPositionsRef.current[i] || currentPos);
            velocitiesRef.current[i] = velocity;
            prevPositionsRef.current[i] = currentPos;

            const gesture = detectGesture(landmarks);
            
            // Draw landmarks only in debug mode
            if (useStore.getState().isDebug) {
              ctx.fillStyle = handedness === 'Left' ? '#00ff00' : '#00ffff';
              for (const landmark of landmarks) {
                ctx.beginPath();
                ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
            
            newHands.push({
              isDetected: true,
              position: currentPos,
              screenPosition: { x: 1 - indexTip.x, y: indexTip.y }, // Mirrored X
              rawLandmarks: landmarks,
              gesture,
              handedness,
              velocity
            });
          }
        }
        
        ctx.restore();
        
        // Update store
        setHands(newHands);
        
        // Handle global mode switching logic
        handleModeSwitching(newHands);
      }

      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    initMediaPipe();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (handLandmarker) handLandmarker.close();
    };
  }, []);

  const handleModeSwitching = (hands: any[]) => {
    if (hands.length === 0) return;
    
    const now = performance.now();
    const primaryHand = hands[0];
    const currentMode = useStore.getState().mode;
    
    // Cooldown to prevent flickering
    if (now - lastModeSwitchTime.current < 1000) return;
    
    // Double open palm -> UI Mode
    if (hands.length === 2 && hands[0].gesture === 'open_palm' && hands[1].gesture === 'open_palm') {
      if (currentMode !== 'ui') {
        setMode('ui');
        lastModeSwitchTime.current = now;
      }
      return;
    }

    // Summon Demon Mode: Peace sign with both hands
    if (hands.length === 2 && hands[0].gesture === 'peace' && hands[1].gesture === 'peace') {
      if (currentMode !== 'demon') {
        setMode('demon');
        lastModeSwitchTime.current = now;
      }
      return;
    }
    
    // Portal Mode: Pointing forward with high Z velocity (swipe forward)
    if (primaryHand.gesture === 'pointing' && primaryHand.velocity && primaryHand.velocity.z < -0.5) {
      if (currentMode !== 'portal') {
        setMode('portal');
        lastModeSwitchTime.current = now;
      }
      return;
    }

    // Summon Mode: Closed fist after being open palm recently
    if (primaryHand.gesture === 'closed_fist') {
      const recentOpen = gestureHistoryRef.current.find(g => g.type === 'open_palm' && now - g.time < 500);
      if (recentOpen && currentMode !== 'summon' && currentMode !== 'object') {
        setMode('summon');
        lastModeSwitchTime.current = now;
        gestureHistoryRef.current = [];
        return;
      }
    }
    
    // Open palm hold -> Break Mode
    if (primaryHand.gesture === 'open_palm') {
      gestureHistoryRef.current.push({ type: 'open_palm', time: now });
      // Keep only last 2 seconds of history to prevent memory leak
      gestureHistoryRef.current = gestureHistoryRef.current.filter(g => now - g.time < 2000);
    } else {
      gestureHistoryRef.current = [];
    }
    
    // Check if open_palm held for 1.5 seconds
    const oldGestures = gestureHistoryRef.current.filter(g => now - g.time > 1500);
    if (oldGestures.length > 0 && currentMode !== 'break') {
      setMode('break');
      setIsBroken(true);
      lastModeSwitchTime.current = now;
      gestureHistoryRef.current = []; // Reset
    }
    
    // Closed fist -> Reset to Object Mode
    if (primaryHand.gesture === 'closed_fist' && currentMode !== 'object' && currentMode !== 'summon') {
      setMode('object');
      setIsBroken(false);
      lastModeSwitchTime.current = now;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-64 h-48 bg-black/50 rounded-xl overflow-hidden border border-white/20 backdrop-blur-md z-50">
      {permissionDenied ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white p-4 text-center text-xs font-mono z-10">
          CAMERA PERMISSION DENIED.<br/>PLEASE ALLOW ACCESS.
        </div>
      ) : !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-mono text-sm animate-pulse">
          INITIALIZING SENSORS...
        </div>
      )}
      <video ref={videoRef} className="hidden" playsInline autoPlay />
      <canvas ref={canvasRef} className="w-full h-full object-cover opacity-70" />
      
      {/* HUD Overlay */}
      <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400">
        SYS.TRACKING: {permissionDenied ? 'ERROR' : isLoaded ? 'ONLINE' : 'OFFLINE'}
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400">
        HANDS: {handsState.length}
      </div>
    </div>
  );
}

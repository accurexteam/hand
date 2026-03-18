# HoloHand Control System

A futuristic hand gesture control system using a webcam for real-time interaction with 3D/2D objects, inspired by Iron Man's holographic interface.

## Features

1. **Object Manipulation Mode (Default)**
   - **Gesture:** Pinch (Thumb + Index Finger)
   - **Action:** Grabs and moves the central 3D object. The object follows your hand smoothly in 3D space.

2. **Break / Atom Mode**
   - **Gesture:** Open Palm (Hold for 1.5 seconds)
   - **Action:** Shatters the main object into hundreds of floating "atoms".
   - **Interaction:** Move your open hand near the atoms to repel and scatter them using physics.
   - **Reset:** Make a Closed Fist to return to Object Mode.

3. **Hologram UI Mode**
   - **Gesture:** Double Open Palm (Both hands open simultaneously)
   - **Action:** Summons futuristic floating UI panels.
   - **Interaction:** Pinch and drag the panels to move them around the screen. Click the 'X' to close them.

## Technical Stack

- **Hand Tracking:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- **3D Rendering:** Three.js & React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- **UI & Animations:** React, Tailwind CSS, Framer Motion
- **State Management:** Zustand

## How Gestures are Detected

Gestures are detected in `src/lib/gestureDetector.ts` by analyzing the 3D distances between specific hand landmarks provided by MediaPipe:

- **Pinch:** Calculates the distance between the Thumb Tip (Landmark 4) and Index Finger Tip (Landmark 8). If the distance is below a threshold, a pinch is registered.
- **Open Palm:** Checks if the tips of all four fingers (Index, Middle, Ring, Pinky) are further away from the Wrist (Landmark 0) than their respective base joints (MCPs).
- **Closed Fist:** Checks if all four finger tips are closer to the wrist than their base joints.

## How to Add New Gestures

To add a new gesture (e.g., "Thumbs Up"):

1. **Update Types:** Add the new gesture name to `GestureType` in `src/store/useStore.ts`.
2. **Add Logic:** Open `src/lib/gestureDetector.ts` and add the detection logic inside `detectGesture`.
   ```typescript
   // Example: Thumbs Up
   const isThumbUp = thumbTip.y < landmarks[3].y && thumbTip.y < indexMcp.y;
   const isFistExceptThumb = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen;
   
   if (isThumbUp && isFistExceptThumb) {
     return 'thumbs_up';
   }
   ```
3. **Map to Action:** Open `src/components/HandTracker.tsx` and add a condition in `handleModeSwitching` to trigger an action when your new gesture is detected.

## Performance Optimizations

- **InstancedMesh:** The "Break Mode" uses `THREE.InstancedMesh` to render hundreds of atoms in a single draw call, maintaining 60 FPS.
- **Exponential Moving Average (EMA):** Hand positions are smoothed using EMA in `gestureDetector.ts` to eliminate jitter and provide stable tracking.
- **WASM Delegation:** MediaPipe runs via WebAssembly (WASM) with GPU delegation for low-latency inference.

import * as THREE from 'three';
import { GestureType } from '../store/useStore';

// Helper to calculate 3D distance between two landmarks
const getDistance = (p1: any, p2: any) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

export const detectGesture = (landmarks: any[]): GestureType => {
  if (!landmarks || landmarks.length < 21) return 'none';

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  // Pinch
  const pinchDist = getDistance(thumbTip, indexTip);
  if (pinchDist < 0.05) {
    return 'pinch';
  }

  // Open Palm
  // Check if tips are further from wrist than MCPs
  const isOpen = (tip: any, mcp: any) => getDistance(wrist, tip) > getDistance(wrist, mcp);
  
  const isIndexOpen = isOpen(indexTip, indexMcp);
  const isMiddleOpen = isOpen(middleTip, middleMcp);
  const isRingOpen = isOpen(ringTip, ringMcp);
  const isPinkyOpen = isOpen(pinkyTip, pinkyMcp);

  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    return 'open_palm';
  }

  // Closed Fist
  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return 'closed_fist';
  }

  // Pointing
  if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return 'pointing';
  }

  // Peace
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return 'peace';
  }

  return 'none';
};

// Smoothing function for 3D position (Exponential Moving Average)
export const smoothPosition = (current: THREE.Vector3, target: THREE.Vector3, alpha: number = 0.3) => {
  return new THREE.Vector3(
    current.x + (target.x - current.x) * alpha,
    current.y + (target.y - current.y) * alpha,
    current.z + (target.z - current.z) * alpha
  );
};

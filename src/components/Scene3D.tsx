import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { Float, MeshDistortMaterial, Sparkles, Stats, Trail, Torus, Ring } from '@react-three/drei';

const NUM_ATOMS = 200;

export function Scene3D() {
  const mode = useStore((state) => state.mode);
  const hands = useStore((state) => state.hands);
  const objectPosition = useStore((state) => state.objectPosition);
  const setObjectPosition = useStore((state) => state.setObjectPosition);
  const objectScale = useStore((state) => state.objectScale);
  const setObjectScale = useStore((state) => state.setObjectScale);
  const objectRotation = useStore((state) => state.objectRotation);
  const setObjectRotation = useStore((state) => state.setObjectRotation);
  const isBroken = useStore((state) => state.isBroken);

  const mainObjRef = useRef<THREE.Mesh>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const prevTwoHandData = useRef<{ dist: number; vec: THREE.Vector3 } | null>(null);
  
  // Atoms state (kept in refs for performance)
  const atomsData = useRef(
    Array.from({ length: NUM_ATOMS }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 1, 0.5)
    }))
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const isDebug = useStore((state) => state.isDebug);

  useFrame((state, delta) => {
    const hand1 = hands[0];
    const hand2 = hands[1];
    
    if (mode === 'object' && !isBroken) {
      // Object Manipulation Mode
      const isHand1Pinching = hand1?.isDetected && hand1.gesture === 'pinch';
      const isHand2Pinching = hand2?.isDetected && hand2.gesture === 'pinch';

      if (isHand1Pinching && isHand2Pinching) {
        // Two-hand interaction: Scale and Rotate
        const dist = hand1.position.distanceTo(hand2.position);
        const vec = hand2.position.clone().sub(hand1.position).normalize();

        if (prevTwoHandData.current) {
          // Scale
          const distDelta = dist - prevTwoHandData.current.dist;
          const newScale = Math.max(0.5, Math.min(5, objectScale + distDelta * 0.2));
          setObjectScale(newScale);

          // Rotate
          const q = new THREE.Quaternion().setFromUnitVectors(prevTwoHandData.current.vec, vec);
          const currentQ = new THREE.Quaternion().setFromEuler(objectRotation);
          currentQ.premultiply(q);
          setObjectRotation(new THREE.Euler().setFromQuaternion(currentQ));
        }
        prevTwoHandData.current = { dist, vec };
      } else {
        prevTwoHandData.current = null;
        
        // Single hand interaction: Move
        const activeHand = isHand1Pinching ? hand1 : (isHand2Pinching ? hand2 : null);
        if (activeHand) {
          const target = activeHand.position;
          objectPosition.lerp(target, 0.1);
          setObjectPosition(objectPosition.clone());
        }
      }
      
      if (mainObjRef.current) {
        mainObjRef.current.position.copy(objectPosition);
        // Apply user rotation + slight auto rotation
        mainObjRef.current.rotation.copy(objectRotation);
        mainObjRef.current.rotation.x += delta * 0.2;
        mainObjRef.current.rotation.y += delta * 0.2;
        
        // Smooth scale transition for summon mode
        const targetScale = mode === 'summon' ? objectScale : (mode === 'object' ? objectScale : 0.01);
        mainObjRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      }
    } else if (mode === 'break' || isBroken) {
      // Break Mode Physics
      if (instancedMeshRef.current) {
        atomsData.current.forEach((atom, i) => {
          atom.position.add(atom.velocity);
          
          // Basic bounds bouncing
          if (Math.abs(atom.position.x) > 8) atom.velocity.x *= -1;
          if (Math.abs(atom.position.y) > 6) atom.velocity.y *= -1;
          if (Math.abs(atom.position.z) > 8) atom.velocity.z *= -1;
          
          // Hand interaction (repel) - Check all detected hands
          hands.forEach(hand => {
            if (hand && hand.isDetected) {
              const dist = atom.position.distanceTo(hand.position);
              if (dist < 3) {
                const force = atom.position.clone().sub(hand.position).normalize().multiplyScalar(0.02);
                atom.velocity.add(force);
              }
            }
          });
          
          // Damping
          atom.velocity.multiplyScalar(0.98);
          
          dummy.position.copy(atom.position);
          dummy.updateMatrix();
          instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {isDebug && <Stats />}
      
      <ambientLight intensity={mode === 'demon' ? 0.1 : 0.5} />
      <pointLight position={[10, 10, 10]} intensity={mode === 'demon' ? 0.2 : 1} color={mode === 'demon' ? "#ff0000" : "#00ffff"} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={mode === 'demon' ? "#440000" : "#ff00ff"} />
      
      {(!isBroken && (mode === 'object' || mode === 'summon')) && (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
          <mesh ref={mainObjRef} castShadow receiveShadow scale={mode === 'summon' ? 0.01 : 1}>
            <icosahedronGeometry args={[1.5, 2]} />
            <MeshDistortMaterial 
              color={mode === 'summon' ? "#ffffff" : "#00ffff"} 
              emissive={mode === 'summon' ? "#ffffff" : "#0088ff"}
              emissiveIntensity={mode === 'summon' ? 2 : 0.5}
              wireframe={true}
              distort={0.3} 
              speed={2} 
            />
          </mesh>
          <Sparkles count={mode === 'summon' ? 200 : 50} scale={mode === 'summon' ? 8 : 4} size={mode === 'summon' ? 4 : 2} speed={mode === 'summon' ? 1 : 0.4} opacity={0.5} color={mode === 'summon' ? "#ffffff" : "#00ffff"} />
        </Float>
      )}

      {mode === 'demon' && (
        <Float speed={1} rotationIntensity={2} floatIntensity={1}>
          <Torus args={[1.5, 0.4, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
            <MeshDistortMaterial color="#110000" emissive="#ff0000" emissiveIntensity={2} distort={0.5} speed={3} wireframe />
          </Torus>
          <Sparkles count={150} scale={6} size={3} speed={0.2} opacity={0.8} color="#ff0000" />
          <Sparkles count={50} scale={8} size={5} speed={0.1} opacity={0.4} color="#000000" />
        </Float>
      )}

      {mode === 'portal' && (
        <Float speed={0.5} rotationIntensity={0} floatIntensity={0.5}>
          <Ring args={[2, 2.5, 64]}>
            <meshBasicMaterial color="#00ffff" side={THREE.DoubleSide} transparent opacity={0.8} />
          </Ring>
          <Sparkles count={100} scale={5} size={2} speed={2} opacity={0.8} color="#00ffff" />
        </Float>
      )}

      {(isBroken || mode === 'break') && (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, NUM_ATOMS]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial 
            color="#00ffff" 
            emissive="#00ffff"
            emissiveIntensity={0.8}
            transparent
            opacity={0.8}
          />
        </instancedMesh>
      )}
      
      {/* Visual feedback for hand position with Trails */}
      {hands.map((hand, i) => {
        if (!hand || !hand.isDetected) return null;
        return (
          <Trail
            key={`trail-${i}`}
            width={0.5}
            color={hand.gesture === 'pinch' ? "#ff0000" : "#00ff00"}
            length={10}
            decay={1}
            local={false}
            stride={0}
            interval={1}
          >
            <mesh position={hand.position}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial 
                color={hand.gesture === 'pinch' ? "#ff0000" : "#00ff00"} 
                wireframe 
                transparent 
                opacity={0.5} 
              />
            </mesh>
          </Trail>
        );
      })}
    </>
  );
}

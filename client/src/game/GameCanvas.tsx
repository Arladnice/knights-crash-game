import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, PerspectiveCamera, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useGameStore, GamePhase } from '../store/useGameStore';

function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/characters/Knight.glb');
  const { animations } = useGLTF('/models/characters/Rig_Medium_MovementBasic.glb');
  const { actions } = useAnimations(animations, group);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    Object.values(actions).forEach(action => action?.stop());
    
    if (phase === GamePhase.RUNNING) {
      const run = actions['Running_A'];
      if (run) {
        run.reset().play();
        // Bypass linter hook mutation check
        Object.assign(run, { paused: false });
      }
    } else if (phase === GamePhase.CRASHED) {
      // Freeze in current run frame (or T-Pose if run not found)
      const run = actions['Running_A'];
      if (run) {
        run.play();
        Object.assign(run, { paused: true });
      } else {
        actions['T-Pose']?.reset().play();
      }
    } else { // WAITING
      // No explicit Idle in this GLB, so we pause the Walk animation on the first frame
      const walk = actions['Walking_A'];
      if (walk) {
        walk.reset().play();
        Object.assign(walk, { paused: true }); // Freeze at frame 0
      } else {
        actions['T-Pose']?.reset().play();
      }
    }
  }, [phase, actions]);

  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function EndlessDungeon() {
  const { scene: floorScene } = useGLTF('/models/dungeon/floor_dirt_large.gltf');
  const { scene: wallScene } = useGLTF('/models/dungeon/wall_half.gltf');
  
  // Apply color tinting to the models
  useEffect(() => {
    wallScene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        // Lighter stone gray for walls
        (mesh.material as THREE.MeshStandardMaterial).color.set('#64748b'); 
      }
    });
    floorScene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        // Mid-tone stone for the floor
        (mesh.material as THREE.MeshStandardMaterial).color.set('#475569');
      }
    });
  }, [wallScene, floorScene]);

  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  
  const segmentsCount = 10;
  const segmentLength = 4; // KayKit large floor tile is 4x4
  const speedRef = useRef(10); // units per second

  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (phase !== GamePhase.RUNNING) return;
    
    // Speed increases slightly with multiplier
    speedRef.current = 10 + (multiplier * 0.5);

    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        child.position.z += speedRef.current * delta;
        if (child.position.z > segmentLength * 2) {
          child.position.z -= segmentLength * segmentsCount;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: segmentsCount }).map((_, i) => (
        <group key={i} position={[0, 0, -i * segmentLength]}>
           <Clone object={floorScene} position={[0, -0.1, 0]} />
           {/* Left walls (two half-walls to cover 4 units) */}
           <Clone object={wallScene} position={[-2, 0, 1]} rotation={[0, Math.PI/2, 0]} />
           <Clone object={wallScene} position={[-2, 0, -1]} rotation={[0, Math.PI/2, 0]} />
           {/* Right walls */}
           <Clone object={wallScene} position={[2, 0, 1]} rotation={[0, -Math.PI/2, 0]} />
           <Clone object={wallScene} position={[2, 0, -1]} rotation={[0, -Math.PI/2, 0]} />
        </group>
      ))}
    </group>
  );
}


useGLTF.preload('/models/characters/Knight.glb');
useGLTF.preload('/models/characters/Rig_Medium_MovementBasic.glb');
useGLTF.preload('/models/dungeon/floor_dirt_large.gltf');
useGLTF.preload('/models/dungeon/wall_half.gltf');

function CameraRig() {
  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (phase === GamePhase.RUNNING && cameraRef.current) {
      const shakeIntensity = Math.max(0, (multiplier - 2) * 0.05);
      if (shakeIntensity > 0) {
        cameraRef.current.position.x = (Math.random() - 0.5) * shakeIntensity;
        cameraRef.current.position.y = 3 + (Math.random() - 0.5) * shakeIntensity;
      } else {
        cameraRef.current.position.x = 0;
        cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 3, 0.1);
      }
    }
  });

  return <PerspectiveCamera ref={cameraRef as any} makeDefault position={[0, 3, 5]} fov={60} rotation={[-0.2, 0, 0]} />;
}

function DustParticles() {
  const phase = useGameStore(s => s.phase);
  const particlesCount = 30;
  
  // Use a ref to hold instances of positions and lifetimes
  const particles = useRef<{x: number, y: number, z: number, life: number, speed: number}[]>([]);
  
  useEffect(() => {
    particles.current = new Array(particlesCount).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 0.8,
      y: Math.random() * 0.5,
      z: Math.random() * 1.5,
      life: Math.random(),
      speed: Math.random() * 2 + 2
    }));
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  useFrame((_state, delta) => {
    if (phase !== GamePhase.RUNNING || !meshRef.current) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    
    particles.current.forEach((p, i) => {
      p.z += p.speed * delta * 4; // Fly backwards relative to runner
      p.y += delta * 1.5; // Float upwards slightly
      p.life -= delta * 1.5; // Fade out/Shrink
      
      if (p.life <= 0) {
        // Respawn at the runner's feet
        p.life = 1;
        p.x = (Math.random() - 0.5) * 0.8;
        p.y = Math.random() * 0.2;
        p.z = 0; // At the runner's Z
      }
      
      dummy.position.set(p.x, p.y, p.z);
      const scale = p.life * 0.2; // Shrink as life goes down
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particlesCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function Effects() {
  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  
  // Chromatic aberration offset based on multiplier (gets crazy at high multipliers)
  const caOffset = phase === GamePhase.RUNNING ? Math.min(0.015, (multiplier - 1) * 0.001) : 0;
  
  // Bloom intensity spikes on crash
  const bloomIntensity = phase === GamePhase.CRASHED ? 3.0 : 1.2;

  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={bloomIntensity} />
      <ChromaticAberration 
        blendFunction={BlendFunction.NORMAL} 
        offset={new THREE.Vector2(caOffset, caOffset)} 
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export const GameCanvas = () => {
  const phase = useGameStore(s => s.phase);

  return (
    <Canvas>
      <CameraRig />
      <Effects />
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 20, 10]} intensity={2.0} castShadow />
      
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 5, 20]} />

      <Suspense fallback={null}>
        <EndlessDungeon />
        <Character />
        <DustParticles />
        {phase === GamePhase.CRASHED && (
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
          </mesh>
        )}
      </Suspense>
    </Canvas>
  );
};

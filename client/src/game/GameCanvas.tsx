import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, PerspectiveCamera, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useGameStore, GamePhase } from '../store/useGameStore';

// Detect mobile once
const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;
const modelUrl = (relPath: string) => `${import.meta.env.BASE_URL}${relPath.replace(/^\//, '')}`;

function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl('models/characters/Knight.glb'));
  const { animations } = useGLTF(modelUrl('models/characters/Rig_Medium_MovementBasic.glb'));
  const { actions } = useAnimations(animations, group);
  const phase = useGameStore(s => s.phase);
  const crashTimeRef = useRef(0);
  // Store original material data so we can reset after burn
  const originalMats = useRef<Map<THREE.MeshStandardMaterial, { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number }>>(new Map());

  // Save original colors once on mount
  useEffect(() => {
    scene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.color && !originalMats.current.has(mat)) {
          originalMats.current.set(mat, {
            color: mat.color.clone(),
            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: mat.emissiveIntensity || 0,
          });
        }
      }
    });
  }, [scene]);

  // Restore original materials helper
  const restoreMaterials = () => {
    originalMats.current.forEach((orig, mat) => {
      mat.color.copy(orig.color);
      mat.emissive.copy(orig.emissive);
      mat.emissiveIntensity = orig.emissiveIntensity;
    });
  };

  useEffect(() => {
    Object.values(actions).forEach(action => action?.stop());
    
    if (phase === GamePhase.RUNNING) {
      crashTimeRef.current = 0;
      restoreMaterials();
      const run = actions['Running_A'];
      if (run) {
        run.reset().play();
        Object.assign(run, { paused: false });
      }
    } else if (phase === GamePhase.CRASHED) {
      crashTimeRef.current = 0;
      const run = actions['Running_A'];
      if (run) {
        run.play();
        Object.assign(run, { paused: true });
      } else {
        actions['T-Pose']?.reset().play();
      }
    } else {
      crashTimeRef.current = 0;
      restoreMaterials();
      const walk = actions['Walking_A'];
      if (walk) {
        walk.reset().play();
        Object.assign(walk, { paused: true });
      } else {
        actions['T-Pose']?.reset().play();
      }
    }
  }, [phase, actions]);

  // Dissolve the knight during crash
  useFrame((_s, delta) => {
    if (!group.current) return;
    if (phase === GamePhase.CRASHED) {
      crashTimeRef.current += delta;
      const t = crashTimeRef.current;
      if (t > 0.8) {
        const dissolveT = Math.min((t - 0.8) / 1.5, 1);
        const scale = Math.max(0, 1 - dissolveT);
        group.current.scale.setScalar(scale);
        group.current.position.y = -dissolveT * 0.5;
        // Tint materials orange/black as burning
        group.current.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.color) {
              mat.color.lerp(new THREE.Color('#1a0a00'), delta * 2);
              mat.emissive?.lerp(new THREE.Color('#ff4400'), delta * 3);
              mat.emissiveIntensity = Math.min(2, (mat.emissiveIntensity || 0) + delta * 3);
            }
          }
        });
      }
    } else {
      group.current.scale.setScalar(1);
      group.current.position.y = 0;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} />
    </group>
  );
}

/* ===================== DRAGON ===================== */
function Dragon() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl('models/characters/Dragon.glb'));
  const phase = useGameStore(s => s.phase);
  const crashTimeRef = useRef(0);

  useEffect(() => {
    crashTimeRef.current = 0;
  }, [phase]);

  useFrame((_s, delta) => {
    if (!group.current) return;

    if (phase === GamePhase.CRASHED) {
      crashTimeRef.current += delta;
      const t = crashTimeRef.current;

      // Phase 1 (0-0.6s): Dragon flies in from above/behind, swooping down
      if (t < 0.6) {
        const flyT = t / 0.6;
        // Ease-out curve for smoother arrival
        const eased = 1 - Math.pow(1 - flyT, 3);
        group.current.position.z = THREE.MathUtils.lerp(12, -2, eased);
        group.current.position.y = THREE.MathUtils.lerp(8, 3, eased);
        group.current.position.x = THREE.MathUtils.lerp(4, 0, eased);
        // Tilt head down as it swoops in
        group.current.rotation.x = THREE.MathUtils.lerp(0, 0.5, eased);
        group.current.rotation.y = THREE.MathUtils.lerp(-Math.PI * 0.4, 0, eased);
      }
      // Phase 2 (0.6s+): Hover angled downward — "breathing fire" pose
      else {
        group.current.position.z = -2;
        group.current.position.x = 0;
        group.current.rotation.y = 0;
        // Tilt body down ~30° toward the knight — looks like fire-breathing
        group.current.rotation.x = 0.5; 
        // Gentle hover bob
        group.current.position.y = 3 + Math.sin(t * 3) * 0.15;
        // Subtle wing-flap-like z-rotation oscillation
        group.current.rotation.z = Math.sin(t * 5) * 0.05;
      }

      group.current.visible = true;
    } else {
      group.current.visible = false;
      group.current.position.set(12, 8, 12);
      group.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <group ref={group} visible={false} scale={[1.5, 1.5, 1.5]}>
      <primitive object={scene} />
    </group>
  );
}

/* ===================== FIRE BREATH ===================== */
function FireBreath() {
  const phase = useGameStore(s => s.phase);
  const particlesCount = isMobile ? 40 : 80;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const crashTimeRef = useRef(0);
  const dummy = new THREE.Object3D();

  type FireParticle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number; size: number };
  const particles = useRef<FireParticle[]>([]);

  useEffect(() => {
    crashTimeRef.current = 0;
    particles.current = [];
  }, [phase]);

  useFrame((_s, delta) => {
    if (!meshRef.current) return;

    if (phase === GamePhase.CRASHED) {
      crashTimeRef.current += delta;
      const t = crashTimeRef.current;

      // Start fire after dragon arrives (~0.7s)
      if (t > 0.7) {
        // Spawn new fire particles from dragon's mouth position
        const spawnRate = isMobile ? 3 : 6;
        for (let i = 0; i < spawnRate; i++) {
          if (particles.current.length < particlesCount) {
            particles.current.push({
              x: (Math.random() - 0.5) * 0.3,
              y: 2.2 + (Math.random() - 0.5) * 0.2,
              z: -1.5 + (Math.random() - 0.5) * 0.3,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 0.8 - 0.3,
              vz: (Math.random()) * 4 + 2, // Toward the knight (positive Z)
              life: 1.0,
              maxLife: 0.4 + Math.random() * 0.4,
              size: 0.15 + Math.random() * 0.2
            });
          }
        }
      }

      // Update particles
      particles.current.forEach((p, i) => {
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.life -= delta / p.maxLife;

        if (p.life <= 0) {
          // Respawn
          p.x = (Math.random() - 0.5) * 0.3;
          p.y = 2.2 + (Math.random() - 0.5) * 0.2;
          p.z = -1.5;
          p.vx = (Math.random() - 0.5) * 1.5;
          p.vy = (Math.random() - 0.5) * 0.8 - 0.3;
          p.vz = (Math.random()) * 4 + 2;
          p.life = 1.0;
          p.maxLife = 0.4 + Math.random() * 0.4;
        }

        const scale = p.life * p.size * (t > 0.7 ? 1 : 0);
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });

      // Fill remaining slots with zero-scale
      for (let i = particles.current.length; i < particlesCount; i++) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }

      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.visible = t > 0.7;
    } else {
      meshRef.current.visible = false;
      particles.current = [];
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particlesCount]}>
      <sphereGeometry args={[1, isMobile ? 4 : 6, isMobile ? 4 : 6]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={0.9} />
    </instancedMesh>
  );
}

/* ===================== ASH PARTICLES ===================== */
function AshParticles() {
  const phase = useGameStore(s => s.phase);
  const particlesCount = isMobile ? 20 : 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const crashTimeRef = useRef(0);
  const dummy = new THREE.Object3D();

  type AshParticle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; size: number };
  const particles = useRef<AshParticle[]>([]);

  useEffect(() => {
    crashTimeRef.current = 0;
    particles.current = [];
  }, [phase]);

  useFrame((_s, delta) => {
    if (!meshRef.current) return;

    if (phase === GamePhase.CRASHED) {
      crashTimeRef.current += delta;
      const t = crashTimeRef.current;

      // Spawn ash after knight starts dissolving (~1.2s)
      if (t > 1.2 && particles.current.length < particlesCount) {
        const spawnCount = isMobile ? 2 : 3;
        for (let i = 0; i < spawnCount; i++) {
          if (particles.current.length < particlesCount) {
            particles.current.push({
              x: (Math.random() - 0.5) * 0.8,
              y: Math.random() * 0.5,
              z: (Math.random() - 0.5) * 0.5,
              vx: (Math.random() - 0.5) * 1.0,
              vy: Math.random() * 2.0 + 0.5,
              vz: (Math.random() - 0.5) * 1.0,
              life: 1.0,
              size: 0.03 + Math.random() * 0.06
            });
          }
        }
      }

      particles.current.forEach((p, i) => {
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vy -= delta * 0.5; // Gravity
        p.life -= delta * 0.5;

        const scale = Math.max(0, p.life) * p.size;
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });

      for (let i = particles.current.length; i < particlesCount; i++) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }

      meshRef.current.instanceMatrix.needsUpdate = true;
      meshRef.current.visible = t > 1.2;
    } else {
      meshRef.current.visible = false;
      particles.current = [];
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particlesCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#333333" transparent opacity={0.7} />
    </instancedMesh>
  );
}

/* ===================== FIRE GLOW LIGHT ===================== */
function FireLight() {
  const phase = useGameStore(s => s.phase);
  const lightRef = useRef<THREE.PointLight>(null);
  const crashTimeRef = useRef(0);

  useEffect(() => { crashTimeRef.current = 0; }, [phase]);

  useFrame((_s, delta) => {
    if (!lightRef.current) return;
    if (phase === GamePhase.CRASHED) {
      crashTimeRef.current += delta;
      const t = crashTimeRef.current;
      if (t > 0.7) {
        lightRef.current.visible = true;
        lightRef.current.intensity = 3 + Math.sin(t * 15) * 1.5; // Flicker
        lightRef.current.position.set(0, 1.5, -0.5);
      } else {
        lightRef.current.visible = false;
      }
    } else {
      lightRef.current.visible = false;
    }
  });

  return <pointLight ref={lightRef} color="#ff4400" distance={8} decay={2} visible={false} />;
}

/* ===================== DUNGEON ===================== */
function EndlessDungeon() {
  const { scene: floorScene } = useGLTF(modelUrl('models/dungeon/floor_dirt_large.gltf'));
  const { scene: wallScene } = useGLTF(modelUrl('models/dungeon/wall_half.gltf'));
  
  useEffect(() => {
    wallScene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).color.set('#64748b'); 
      }
    });
    floorScene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).color.set('#475569');
      }
    });
  }, [wallScene, floorScene]);

  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  
  const segmentsCount = isMobile ? 6 : 10;
  const segmentLength = 4;
  const speedRef = useRef(10);

  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_state, delta) => {
    if (phase !== GamePhase.RUNNING) return;
    
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
           <Clone object={wallScene} position={[-2, 0, 1]} rotation={[0, Math.PI/2, 0]} />
           <Clone object={wallScene} position={[-2, 0, -1]} rotation={[0, Math.PI/2, 0]} />
           <Clone object={wallScene} position={[2, 0, 1]} rotation={[0, -Math.PI/2, 0]} />
           <Clone object={wallScene} position={[2, 0, -1]} rotation={[0, -Math.PI/2, 0]} />
        </group>
      ))}
    </group>
  );
}


useGLTF.preload(modelUrl('models/characters/Knight.glb'));
useGLTF.preload(modelUrl('models/characters/Rig_Medium_MovementBasic.glb'));
useGLTF.preload(modelUrl('models/characters/Dragon.glb'));
useGLTF.preload(modelUrl('models/dungeon/floor_dirt_large.gltf'));
useGLTF.preload(modelUrl('models/dungeon/wall_half.gltf'));

function CameraRig() {
  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (cameraRef.current) {
      if (phase === GamePhase.RUNNING) {
        const shakeIntensity = Math.max(0, (multiplier - 2) * 0.05);
        if (shakeIntensity > 0) {
          cameraRef.current.position.x = (Math.random() - 0.5) * shakeIntensity;
          cameraRef.current.position.y = 3 + (Math.random() - 0.5) * shakeIntensity;
        } else {
          cameraRef.current.position.x = 0;
          cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 3, 0.1);
        }
        cameraRef.current.position.z = 5;
      } else if (phase === GamePhase.CRASHED) {
        // Pull camera back slightly to see the dragon
        cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, 0, 0.05);
        cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 3.5, 0.05);
        cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, 6.5, 0.05);
      } else {
        cameraRef.current.position.x = 0;
        cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 3, 0.1);
        cameraRef.current.position.z = 5;
      }
    }
  });

  return <PerspectiveCamera ref={cameraRef as React.RefObject<THREE.PerspectiveCamera>} makeDefault position={[0, 3, 5]} fov={60} rotation={[-0.2, 0, 0]} />;
}

const DUST_PARTICLES_COUNT = isMobile ? 15 : 30;

function DustParticles() {
  const phase = useGameStore(s => s.phase);
  
  const particles = useRef<{x: number, y: number, z: number, life: number, speed: number}[]>([]);
  
  useEffect(() => {
    particles.current = new Array(DUST_PARTICLES_COUNT).fill(0).map(() => ({
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
      p.z += p.speed * delta * 4;
      p.y += delta * 1.5;
      p.life -= delta * 1.5;
      
      if (p.life <= 0) {
        p.life = 1;
        p.x = (Math.random() - 0.5) * 0.8;
        p.y = Math.random() * 0.2;
        p.z = 0;
      }
      
      dummy.position.set(p.x, p.y, p.z);
      const scale = p.life * 0.2;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_PARTICLES_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// Desktop-only effects
function Effects() {
  const phase = useGameStore(s => s.phase);
  const multiplier = useGameStore(s => s.multiplier);
  
  const caOffset = phase === GamePhase.RUNNING ? Math.min(0.015, (multiplier - 1) * 0.001) : 0;
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
  return (
    <Canvas dpr={isMobile ? [1, 1] : [1, 2]}>
      <CameraRig />
      {!isMobile && <Effects />}
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 20, 10]} intensity={2.0} castShadow={!isMobile} />
      
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 5, isMobile ? 15 : 20]} />

      <Suspense fallback={null}>
        <EndlessDungeon />
        <Character />
        <Dragon />
        <FireBreath />
        <AshParticles />
        <FireLight />
        <DustParticles />
      </Suspense>
    </Canvas>
  );
};

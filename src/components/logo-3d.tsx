import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text3D, Environment, Float } from "@react-three/drei";
import * as THREE from "three";

const FONT_URL =
  "https://threejs.org/examples/fonts/gentilis_bold.typeface.json";

function GzafMesh() {
  const textRef = useRef<THREE.Mesh>(null);

  const centerGeometry = (mesh: THREE.Mesh) => {
    if (!mesh.geometry.userData.gzafCentered) {
      mesh.geometry.center();
      mesh.geometry.computeBoundingSphere();
      mesh.geometry.userData.gzafCentered = true;
    }
    mesh.visible = true;
  };

  useLayoutEffect(() => {
    const m = textRef.current;
    if (m?.geometry) centerGeometry(m);
  }, []);

  return (
    <Float speed={1.2} rotationIntensity={0} floatIntensity={0}>
      <Text3D
        ref={textRef}
        onUpdate={centerGeometry}
        position={[0, 0, 0]}
        visible={false}
        font={FONT_URL}
        size={1}
        height={0.24}
        curveSegments={10}
        bevelEnabled
        bevelThickness={0.025}
        bevelSize={0.016}
        bevelOffset={0}
        bevelSegments={4}
        letterSpacing={-0.02}
      >
        GZAF
        <meshPhysicalMaterial
          color="#b3121f"
          metalness={1}
          roughness={0.3}
          clearcoat={1}
          clearcoatRoughness={0.18}
          reflectivity={0.9}
          envMapIntensity={1.3}
        />
      </Text3D>
    </Float>
  );
}

function ResponsiveRotator() {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // "GZAF" text width ≈ 4 units at size 1. Fit to viewport width with padding.
  const targetWidth = 4.2;
  const scale = Math.min(1, (viewport.width * 0.92) / targetWidth);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.35;
  });

  return (
    <group ref={groupRef} scale={scale}>
      <GzafMesh />
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} />
      <spotLight position={[-5, 3, -3]} angle={0.5} penumbra={1} intensity={2} color="#ff2030" />
      <spotLight position={[5, 2, -4]} angle={0.6} penumbra={1} intensity={1.3} color="#ff5566" />

      <Suspense fallback={null}>
        <ResponsiveRotator />
        <Environment preset="studio" background={false} />
      </Suspense>
    </>
  );
}

export default function Logo3D() {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Simulate a quick "tap" on load so the canvas re-measures and the logo snaps
  // into its final centered position immediately on mobile.
  useEffect(() => {
    const nudge = () => window.dispatchEvent(new Event("resize"));
    const t1 = requestAnimationFrame(nudge);
    const t2 = setTimeout(nudge, 60);
    const t3 = setTimeout(nudge, 200);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div ref={wrapRef} className="w-full h-full pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.3, 5], fov: 32 }}
        frameloop="always"
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}


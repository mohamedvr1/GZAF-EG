import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

type Props = {
  children: ReactNode;
  className?: string;
  intensity?: number; // rotation degrees at edges
  glare?: boolean;
  scale?: number;
};

/**
 * 3D tilt card — tracks mouse position and rotates on X/Y with perspective.
 * Children can use `data-depth="N"` to translate on Z (parallax depth).
 */
export function Tilt3D({
  children,
  className = "",
  intensity = 10,
  glare = true,
  scale = 1.02,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springCfg = { stiffness: 180, damping: 20, mass: 0.4 };
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), springCfg);
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), springCfg);
  const s = useSpring(1, springCfg);
  const glareX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useSpring(0, springCfg);
  const glareBackground = useRadialGlare(glareX, glareY);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => {
        s.set(scale);
        glareOpacity.set(0.18);
      }}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
        s.set(1);
        glareOpacity.set(0);
      }}
      style={{
        rotateX: rx,
        rotateY: ry,
        scale: s,
        transformStyle: "preserve-3d",
        transformPerspective: 1200,
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            opacity: glareOpacity,
            background: glareBackground,
            transform: "translateZ(1px)",
          }}
        />
      )}
    </motion.div>
  );
}

function useRadialGlare(x: MotionValue<string>, y: MotionValue<string>) {
  return useTransform(
    [x, y] as MotionValue<string>[],
    ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.55), transparent 55%)`,
  );
}

/** Child layer that translates on Z for parallax depth inside a Tilt3D. */
export function Depth({
  z = 30,
  className = "",
  children,
}: {
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}

import React, { useState, useRef } from "react";
import { Shield, Sparkles, Eye, RotateCcw } from "lucide-react";

interface Logo3DProps {
  size?: "sm" | "md" | "lg" | "hero";
  interactive?: boolean;
}

export const Logo3DAnimation: React.FC<Logo3DProps> = ({
  size = "hero",
  interactive = true,
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glintPos, setGlintPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalizado entre -1 y 1
    const px = (x / rect.width) * 2 - 1;
    const py = (y / rect.height) * 2 - 1;
    
    setRotateY(px * 18);
    setRotateX(-py * 14);
    setGlintPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-28 h-28",
    hero: "w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96",
  };

  if (size === "sm") {
    return (
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full" />
        <img
          src="/manus-storage/vulnlab_3d_logo_f877aaf2.png"
          alt="VulnLab 3D Emblem"
          className="w-9 h-9 object-contain relative z-10 transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Halo ambiental cinematográfico */}
      <div className="absolute -inset-10 bg-gradient-to-tr from-emerald-600/25 via-cyan-500/15 to-transparent blur-3xl pointer-events-none rounded-full animate-pulse" />
      
      {/* Contenedor 3D con perspectiva */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: 1200,
        }}
        className={`relative ${sizeClasses[size]} cursor-grab active:cursor-grabbing select-none`}
      >
        <div
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.05 : 1}, ${isHovered ? 1.05 : 1}, 1)`,
            transformStyle: "preserve-3d",
            transition: isHovered ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
          className="relative w-full h-full rounded-2xl flex items-center justify-center group"
        >
          {/* Anillos orbitales holográficos */}
          <div
            style={{ transform: "translateZ(-30px)" }}
            className="absolute inset-[-8%] rounded-full border border-emerald-500/20 border-dashed animate-[spin_24s_linear_infinite] pointer-events-none"
          />
          <div
            style={{ transform: "translateZ(-15px)" }}
            className="absolute inset-[-4%] rounded-full border border-cyan-400/20 animate-[spin_16s_linear_infinite_reverse] pointer-events-none"
          />

          {/* Imagen de logotipo 3D dimensional */}
          <div
            style={{ transform: "translateZ(40px)" }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <img
              src="/manus-storage/vulnlab_3d_logo_f877aaf2.png"
              alt="VulnLab 3D Cyber Shield Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] drop-shadow-[0_0_40px_rgba(16,185,129,0.35)] animate-float-slow"
              loading="eager"
            />
          </div>

          {/* Reflejo de luz dinámica / Glint interactivo */}
          <div
            style={{
              background: `radial-gradient(circle at ${glintPos.x}% ${glintPos.y}%, rgba(255,255,255,0.4) 0%, rgba(16,185,129,0.2) 25%, transparent 60%)`,
              transform: "translateZ(60px)",
            }}
            className="absolute inset-0 rounded-3xl pointer-events-none mix-blend-overlay opacity-80 transition-opacity duration-300"
          />

          {/* Indicador de interacción 3D */}
          {size === "hero" && (
            <div
              style={{ transform: "translateZ(70px)" }}
              className="absolute -bottom-4 px-3 py-1 bg-slate-900/90 border border-emerald-500/40 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 text-xs text-emerald-300 pointer-events-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Giro 3D Interactivo • Mueve el cursor</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

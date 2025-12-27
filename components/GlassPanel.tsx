import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = "", intensity = "medium" }) => {
  const baseClasses = "backdrop-blur-xl border border-emerald-500/20 shadow-2xl overflow-hidden rounded-3xl";
  
  const intensityMap = {
    low: "bg-emerald-950/20",
    medium: "bg-emerald-950/40",
    high: "bg-emerald-950/70"
  };

  return (
    <div className={`${baseClasses} ${intensityMap[intensity]} ${className}`}>
      {children}
    </div>
  );
};

export default GlassPanel;
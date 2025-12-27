
import React from 'react';

interface RobotProps {
  isThinking?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Robot: React.FC<RobotProps> = ({ isThinking = false, className = "", size = "md" }) => {
  const dimensions = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-48 h-48",
    xl: "w-72 h-72"
  };

  return (
    <div className={`relative ${dimensions[size]} ${className} group flex items-center justify-center`}>
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500 ${isThinking ? 'animate-bounce' : 'group-hover:scale-105'}`}
      >
        {/* Antenna */}
        <line x1="100" y1="40" x2="100" y2="20" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="15" r="8" fill="#10b981">
          {isThinking && <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" />}
        </circle>

        {/* Head */}
        <rect x="60" y="40" width="80" height="60" rx="15" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
        
        {/* Eyes */}
        <g className={isThinking ? 'animate-pulse' : ''}>
          <rect x="75" y="55" width="20" height="15" rx="5" fill="#34d399">
            {isThinking && <animate attributeName="height" values="15;2;15" dur="1.5s" repeatCount="indefinite" />}
          </rect>
          <rect x="105" y="55" width="20" height="15" rx="5" fill="#34d399">
            {isThinking && <animate attributeName="height" values="15;2;15" dur="1.5s" repeatCount="indefinite" />}
          </rect>
        </g>

        {/* Mouth/LED */}
        <rect x="85" y="80" width="30" height="4" rx="2" fill="#10b981">
           {isThinking && <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />}
        </rect>

        {/* Body */}
        <rect x="50" y="105" width="100" height="70" rx="20" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
        
        {/* Gears/Core */}
        <circle cx="100" cy="140" r="20" fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="5,3">
          <animateTransform attributeName="transform" type="rotate" from="0 100 140" to="360 100 140" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="140" r="10" fill="#10b981">
           <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Arms */}
        <path d="M50 120 Q30 120 30 150" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round">
           {isThinking && <animate attributeName="d" values="M50 120 Q30 120 30 150;M50 120 Q20 120 20 140;M50 120 Q30 120 30 150" dur="2s" repeatCount="indefinite" />}
        </path>
        <path d="M150 120 Q170 120 170 150" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round">
           {isThinking && <animate attributeName="d" values="M150 120 Q170 120 170 150;M150 120 Q180 120 180 140;M150 120 Q170 120 170 150" dur="2s" repeatCount="indefinite" />}
        </path>
      </svg>

      {/* Thinking Aura */}
      {isThinking && (
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse -z-10 scale-150"></div>
      )}
    </div>
  );
};

export default Robot;

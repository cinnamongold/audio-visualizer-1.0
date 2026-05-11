import { useState } from 'react';

export default function Logo({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) {
  const [showText, setShowText] = useState(false);

  const scales = {
    sm: { box: "w-8 h-8", ut: "text-xs", rax: "text-xl", rounded: "rounded-lg", text: "text-lg" },
    md: { box: "w-12 h-12", ut: "text-lg", rax: "text-3xl", rounded: "rounded-xl", text: "text-2xl" },
    lg: { box: "w-20 h-20", ut: "text-3xl", rax: "text-6xl", rounded: "rounded-[18px]", text: "text-4xl" }
  };

  const s = scales[size];

  return (
    <div 
      className={`cursor-pointer select-none flex items-center ${className}`} 
      onClick={() => setShowText(!showText)}
    >
      {showText ? (
        <span className={`${s.text} font-bold tracking-tighter bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent italic flex items-center leading-none`}>
          UTrax Local Player
        </span>
      ) : (
        <div className="flex items-center gap-1.5 h-full">
          <div className={`${s.box} bg-[#92F7FF] ${s.rounded} flex items-center justify-center shadow-sm`}>
            <span className={`${s.ut} text-[#69B4C0] font-slab font-[900] leading-none tracking-tight translate-y-[10%]`}>UT</span>
          </div>
          <span className={`${s.rax} text-[#69B4C0] font-slab font-[900] leading-none tracking-tight -ml-0.5 flex items-center translate-y-[5%]`}>rax</span>
        </div>
      )}
    </div>
  );
}

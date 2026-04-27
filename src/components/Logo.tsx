import React from 'react';

export default function Logo({ className = "h-8", light = false }: { className?: string, light?: boolean }) {
  const primaryColor = light ? "text-white" : "text-[#0B2A4A]";
  const goldColor = "text-[#D4AF37]";

  return (
    <div className={`flex flex-col items-start leading-none ${className}`}>
      <div className="flex items-baseline font-black tracking-tight">
        <div className="relative flex items-center">
          <span className={`text-[1.8em] ${primaryColor} relative`}>
            B
            <span className="absolute left-0 top-[20%] w-[15%] h-[60%] bg-[#D4AF37] opacity-80 rounded-full -translate-x-1"></span>
          </span>
          <span className={`text-[1.8em] ${goldColor} lowercase`}>i</span>
          <span className={`text-[1.8em] ${primaryColor}`}>LIMAL</span>
        </div>
      </div>
      <div className={`text-[0.45em] font-bold uppercase tracking-[0.1em] ${light ? 'text-[#D4AF37]' : 'text-[#0B2A4A]'} whitespace-nowrap`}>
        подготовка к бил и ниш
      </div>
    </div>
  );
}

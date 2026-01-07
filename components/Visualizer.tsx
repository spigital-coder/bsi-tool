import React, { useState, useEffect } from 'react';
import { BellowsPart, CuffEndType } from '../types';

interface VisualizerProps {
  part: BellowsPart | null;
  cuffType: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ part, cuffType }) => {
  const [imgError, setImgError] = useState(false);
  const viewWidth = 800;
  const viewHeight = 600;
  
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;

  // Geometry Setup for Fallback SVG
  const numConvolutions = 7;
  const bellowsWidth = 440;
  const innerRadius = 110; 
  const convHeight = 55;
  const outerRadius = innerRadius + convHeight;
  
  const convWidth = bellowsWidth / numConvolutions;
  const startX = centerX - (bellowsWidth / 2);
  const endX = centerX + (bellowsWidth / 2);
  const cuffLength = 90;

  const isUCuff = cuffType.includes("U CUFF") || cuffType === CuffEndType.U_CUFF;

  // Reset error state and trigger a subtle animation when part changes
  useEffect(() => {
    setImgError(false);
  }, [part?.part_number]);

  const renderBellowsBody = () => {
    if (!part) return null;

    const segments = [];
    for (let i = 0; i < numConvolutions; i++) {
      const xStart = startX + i * convWidth;
      const xMid = xStart + convWidth / 2;
      const xEnd = xStart + convWidth;

      segments.push(
        <g key={`segment-${i}`}>
          <rect 
            x={xStart} 
            y={centerY - innerRadius} 
            width={convWidth} 
            height={innerRadius * 2} 
            fill="url(#bodyShading)" 
          />
          <path
            d={`M ${xStart} ${centerY - innerRadius} 
               C ${xStart} ${centerY - outerRadius - 15}, ${xEnd} ${centerY - outerRadius - 15}, ${xEnd} ${centerY - innerRadius}`}
            fill="url(#metalGradientTop)"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <path
            d={`M ${xStart + 8} ${centerY - outerRadius + 6} Q ${xMid} ${centerY - outerRadius - 4}, ${xEnd - 8} ${centerY - outerRadius + 6}`}
            fill="none"
            stroke="white"
            strokeWidth="4"
            opacity="0.4"
            strokeLinecap="round"
          />
          <path
            d={`M ${xStart} ${centerY + innerRadius} 
               C ${xStart} ${centerY + outerRadius + 15}, ${xEnd} ${centerY + outerRadius + 15}, ${xEnd} ${centerY + innerRadius}`}
            fill="url(#metalGradientBottom)"
            stroke="#1a1a1a"
            strokeWidth="1"
          />
          <path
            d={`M ${xStart + 8} ${centerY + outerRadius - 6} Q ${xMid} ${centerY + outerRadius + 4}, ${xEnd - 8} ${centerY + outerRadius - 6}`}
            fill="none"
            stroke="white"
            strokeWidth="4"
            opacity="0.3"
            strokeLinecap="round"
          />
        </g>
      );
    }

    return (
      <g>
        {segments}
        {renderCuffs()}
        {renderAnnotations()}
      </g>
    );
  };

  const renderCuffs = () => {
    const isNone = cuffType.includes("WITHOUT") || cuffType.includes("TRUNCATED");
    if (isNone) return null;

    const cuffY = isUCuff ? centerY - outerRadius : centerY - innerRadius;
    const cuffH = isUCuff ? outerRadius * 2 : innerRadius * 2;

    return (
      <g>
        <rect 
          x={startX - cuffLength} 
          y={cuffY} 
          width={cuffLength} 
          height={cuffH} 
          fill="url(#bodyShading)" 
          stroke="#1a1a1a" 
          strokeWidth="1.5"
        />
        <rect 
          x={endX} 
          y={cuffY} 
          width={cuffLength} 
          height={cuffH} 
          fill="url(#bodyShading)" 
          stroke="#1a1a1a" 
          strokeWidth="1.5"
        />
      </g>
    );
  };

  const renderAnnotations = () => {
    if (!part) return null;
    return (
      <g className="annotations pointer-events-none">
        <line x1={startX - 140} y1={centerY} x2={endX + 140} y2={centerY} stroke="#C80A37" strokeWidth="3" strokeDasharray="12,6" />
        <text x={startX - 150} y={centerY} fill="#C80A37" fontSize="16" fontWeight="bold" textAnchor="end" dominantBaseline="middle">Mean Diameter</text>
      </g>
    );
  };

  const showImage = part?.image_url && !imgError;

  return (
    <div className="w-full h-[600px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
      <div className="absolute top-8 left-10 z-20">
         <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <span className={`w-3 h-3 rounded-full ${showImage ? 'bg-green-500' : 'bg-red-600 shadow-[0_0_10px_#C80A37] animate-pulse'}`}></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
              {showImage ? 'Authentic Component Photo' : 'Engineering Render Engine v2.5'}
            </span>
         </div>
      </div>
      
      {!part ? (
         <div className="text-center opacity-30 scale-90">
            <div className="w-24 h-24 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <p className="text-gray-600 font-black tracking-[0.2em] text-[10px] uppercase">Select Entry to Initialize Viewport</p>
         </div>
      ) : showImage ? (
        <div className="w-full h-full flex items-center justify-center p-6 animate-in fade-in zoom-in duration-700">
          <img 
            src={part.image_url} 
            alt={`Part ${part.part_number}`} 
            className="max-w-full max-h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.15)] rounded-2xl"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
            preserveAspectRatio="xMidYMid meet"
            className="drop-shadow-2xl animate-in fade-in duration-500"
        >
            <defs>
                <linearGradient id="metalGradientTop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#414a4c" />
                    <stop offset="20%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#f3f4f6" />
                    <stop offset="80%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#111827" />
                </linearGradient>
                <linearGradient id="metalGradientBottom" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#111827" />
                    <stop offset="20%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#f3f4f6" />
                    <stop offset="80%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#414a4c" />
                </linearGradient>
                <linearGradient id="bodyShading" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a202c" />
                    <stop offset="10%" stopColor="#e2e8f0" />
                    <stop offset="35%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#f1f5f9" />
                    <stop offset="65%" stopColor="#94a3b8" />
                    <stop offset="90%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#1a202c" />
                </linearGradient>
            </defs>
            {renderBellowsBody()}
        </svg>
      )}

      {part && (
        <div className="absolute bottom-10 right-10 flex flex-col items-end gap-4 scale-90 md:scale-100 z-10">
            <div className="bg-[#C80A37] text-white text-[9px] px-4 py-1.5 rounded-full font-black tracking-widest shadow-xl shadow-red-200 uppercase animate-in slide-in-from-right duration-500">
               {showImage ? 'Live Node Active' : 'Virtual Analysis Ready'}
            </div>
            <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-[2rem] border border-gray-100 shadow-2xl border-l-[8px] border-l-[#C80A37] min-w-[260px] animate-in slide-in-from-bottom-5 duration-700">
                <div className="text-base font-black text-gray-800 mb-1">{part.part_number}</div>
                <div className="text-[#C80A37] font-bold text-[10px] uppercase tracking-widest mb-4">{cuffType}</div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-50 pt-4 font-black uppercase tracking-tight">
                    <div className="flex flex-col"><span className="text-gray-300 mb-0.5">OD</span><span>{part.bellows_od_in}"</span></div>
                    <div className="flex flex-col"><span className="text-gray-300 mb-0.5">ID</span><span>{part.bellows_id_in}"</span></div>
                    <div className="flex flex-col"><span className="text-gray-300 mb-0.5">Length</span><span>{part.overall_length_oal_in}"</span></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
import React from 'react';
import { BLOCK_DEFS, BlockType, BlockCategory } from '../blocks';
import { cn } from '../lib/utils';
import { Rocket } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

const CATEGORY_COLORS: Record<BlockCategory, { bgStart: string; bgEnd: string; border: string; glow: string }> = {
  EVENTS: { bgStart: '#ffe57f', bgEnd: '#ffb300', border: '#fff5cc', glow: 'rgba(255, 198, 0, 0.3)' },
  MOTION: { bgStart: '#6699ff', bgEnd: '#225eb2', border: '#b3ccff', glow: 'rgba(51, 115, 204, 0.3)' },
  LOOKS: { bgStart: '#be9eff', bgEnd: '#6633cc', border: '#e5d9ff', glow: 'rgba(153, 102, 255, 0.3)' },
  SOUND: { bgStart: '#7ee382', bgEnd: '#29912b', border: '#c3f5c5', glow: 'rgba(76, 193, 77, 0.3)' },
  CONTROL: { bgStart: '#ffb347', bgEnd: '#cc6600', border: '#ffe5bf', glow: 'rgba(255, 153, 0, 0.3)' },
  END: { bgStart: '#ff8080', bgEnd: '#cc2222', border: '#ffd9d9', glow: 'rgba(255, 77, 77, 0.3)' },
};

interface VisualBlockProps {
  key?: React.Key;
  type: BlockType;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  times?: number;
  text?: string;
  isWorkspace?: boolean;
}

export function VisualBlock({ type, isActive, onClick, className, times, text, isWorkspace }: VisualBlockProps) {
  const def = BLOCK_DEFS[type];
  const colors = CATEGORY_COLORS[def.category] || { bgStart: '#ffe57f', bgEnd: '#ffb300', border: '#fff5cc', glow: 'rgba(255, 198, 0, 0.55)' };

  const isMotion = def.category === 'MOTION';
  const iconSizeClass = isMotion ? "w-[44px] h-[44px]" : "w-[52px] h-[52px]";
  let iconSrc = getAssetUrl(def.icon);

  if (type === 'START_GET_MESSAGE') {
    const color = text || 'orange';
    const cap = color.charAt(0).toUpperCase() + color.slice(1);
    iconSrc = getAssetUrl(`/icons/LetterGet_${cap}.svg`);
  } else if (type === 'SEND_MESSAGE') {
    const color = text || 'orange';
    const cap = color.charAt(0).toUpperCase() + color.slice(1);
    iconSrc = getAssetUrl(`/icons/LetterSend_${cap}.svg`);
  } else if (type === 'SET_SPEED') {
    // Mapping: 1 (Slow) -> speed0, 2 (Medium) -> speed1, 3 (Fast) -> speed2
    // Force numeric value to be safe
    const speedLevel = typeof times === 'number' ? times : (typeof times === 'string' ? parseInt(times) : 2);
    const speedIconIndex = Math.max(0, Math.min(2, speedLevel - 1));
    iconSrc = getAssetUrl(`/icons/speed${speedIconIndex}.svg`);
  }

  // Compute a beautiful single path for the puzzle piece background at exactly 90x64 dimensions
  let pathD = "";
  if (def.category === 'EVENTS' && type !== 'SEND_MESSAGE') {
    // EVENTS starting blocks have a large rounded left side and a right bump
    pathD = "M 32,0.5 L 71.5,0.5 A 8,8 0 0,1 79.5,8.5 L 79.5,22 A 10,10 0 0,1 79.5,42 L 79.5,55.5 A 8,8 0 0,1 71.5,63.5 L 32,63.5 A 31.5,31.5 0 0,1 32,0.5 Z";
  } else if (def.category === 'END') {
    // END blocks have left notch and a large rounded right side (D-shape)
    pathD = "M 8.5,0.5 L 48,0.5 A 31.5,31.5 0 0,1 48,63.5 L 8.5,63.5 A 8,8 0 0,1 0.5,55.5 L 0.5,42 A 10,10 0 0,0 0.5,22 L 0.5,8.5 A 8,8 0 0,1 8.5,0.5 Z";
  } else {
    // STANDARD blocks have both left notch and right bump to connect nicely
    pathD = "M 8.5,0.5 L 71.5,0.5 A 8,8 0 0,1 79.5,8.5 L 79.5,22 A 10,10 0 0,1 79.5,42 L 79.5,55.5 A 8,8 0 0,1 71.5,63.5 L 8.5,63.5 A 8,8 0 0,1 0.5,55.5 L 0.5,42 A 10,10 0 0,0 0.5,22 L 0.5,8.5 A 8,8 0 0,1 8.5,0.5 Z";
  }

  const glowStyle = {
    filter: `drop-shadow(0 1px 2px ${colors.glow})` + (isActive ? ` drop-shadow(0 2px 4px ${colors.glow})` : '')
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center cursor-pointer transition-transform select-none shrink-0",
        "h-16 w-[90px]",
        isActive ? "scale-110 z-10" : "hover:scale-105",
        className
      )}
    >
      {/* Background SVG - contains the block's body and border */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        viewBox="0 0 90 64"
        shapeRendering="geometricPrecision"
        style={glowStyle}
      >
        <defs>
          <linearGradient id={`grad-${def.category}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.bgStart} />
            <stop offset="100%" stopColor={colors.bgEnd} />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          fill={`url(#grad-${def.category})`}
          stroke={colors.border}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Content Layer (Icon) */}
      <div className="relative z-10 flex items-center justify-center w-full h-full pr-1.5">
        {iconSrc ? (
          <div className="relative">
            <img
              src={iconSrc}
              alt={def.type}
              className={cn("pointer-events-none select-none drop-shadow-sm shrink-0 max-w-none", iconSizeClass)}
            />
            {type === 'PLAY_RECORDED' && times !== undefined && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#2390b5] rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black font-mono shadow-sm">
                {times}
              </div>
            )}
          </div>
        ) : type === 'GOTO_PAGE' ? (
          <div className="relative w-12 h-9 bg-white border border-slate-300 rounded shadow-sm flex items-center justify-center overflow-visible">
            {/* Miniature content inside the page: Tik cat sprite! */}
            <div className="absolute inset-0 bg-sky-50 flex items-center justify-center rounded overflow-hidden">
              <img src={getAssetUrl('/sprites/cat1.svg')} className="w-5 h-5 object-contain" alt="" />
            </div>
            {/* Number badge on the top right (exactly like the picture!) */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2390b5] rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black font-mono shadow-sm">
              {times !== undefined ? times : 2}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

 import React from 'react';
import { getAssetUrl } from '../utils/assets';

interface Scene {
  id: string;
  background?: string;
  characters?: { id: string; name: string; spriteUrl: string; }[];
  spriteStates?: Record<string, { x: number; y: number; scale: number; flipX?: boolean; visible: boolean; }>;
}

interface SceneThumbnailProps {
  scene?: Scene;
  sceneNumber?: number;
  className?: string;
  size?: 'small' | 'large';
}

export function SceneThumbnail({ scene, sceneNumber, className, size = 'small' }: SceneThumbnailProps) {
  const isSmall = size === 'small';
  
  return (
    <div className={`relative bg-white border border-slate-300 rounded shadow-sm overflow-hidden ${isSmall ? 'w-12 h-9' : 'w-24 h-18'} ${className}`}>
      {/* Background */}
      {scene?.background ? (
        <img 
          src={scene.background} 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="" 
        />
      ) : (
        <div className="absolute inset-0 bg-sky-50" />
      )}

      {/* Content Overlay (Characters) */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {scene?.characters?.map((char) => {
          const state = scene.spriteStates?.[char.id];
          if (state && state.visible === false) return null;

          const x = state?.x ?? 10.5;
          const y = state?.y ?? 8;
          const scale = state?.scale ?? 1;

          // Match Stage.tsx calculations exactly
          const leftPercent = (x - 0.5) * 5;
          const topPercent = 100 - (y - 0.5) * (100 / 15);
          
          // Use a larger relative size for small thumbnails to ensure visibility
          const characterSizePercent = (isSmall ? 40 : 25) * scale;

          return (
            <div 
              key={char.id}
              className="absolute flex items-center justify-center"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${characterSizePercent}%`,
                height: `${characterSizePercent}%`,
                transform: 'translate(-50%, -50%)',
                opacity: state?.visible !== false ? 1 : 0
              }}
            >
              <img 
                src={char.spriteUrl} 
                className="w-full h-full object-contain drop-shadow-md block"
                style={{
                  transform: (state as any)?.flipX ? 'scaleX(-1)' : 'none'
                }}
                alt="" 
              />
            </div>
          );
        })}
      </div>

      {/* Scene Number Badge */}
      {sceneNumber !== undefined && (
        <div className={`absolute -top-0.5 -right-0.5 ${isSmall ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[12px]'} bg-[#2390b5] rounded-full border border-white flex items-center justify-center text-white font-black font-mono shadow-sm`}>
          {sceneNumber}
        </div>
      )}
    </div>
  );
}

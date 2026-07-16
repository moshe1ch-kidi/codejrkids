import React from 'react';
import { getAssetUrl } from '../utils/assets';

interface Scene {
  id: string;
  background?: string;
  characters?: { id: string; name: string; spriteUrl: string; }[];
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
    <div className={`relative bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex items-center justify-center ${isSmall ? 'w-12 h-9' : 'w-24 h-18'} ${className}`}>
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

      {/* Primary Character Preview */}
      {scene?.characters && scene.characters.length > 0 && (
        <div className="relative z-10 flex items-center justify-center">
          <img 
            src={scene.characters[0].spriteUrl} 
            className={`${isSmall ? 'w-5 h-5' : 'w-10 h-10'} object-contain`} 
            alt="" 
          />
        </div>
      )}

      {/* Scene Number Badge */}
      {sceneNumber !== undefined && (
        <div className={`absolute -top-0.5 -right-0.5 ${isSmall ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[12px]'} bg-[#2390b5] rounded-full border border-white flex items-center justify-center text-white font-black font-mono shadow-sm`}>
          {sceneNumber}
        </div>
      )}
    </div>
  );
}

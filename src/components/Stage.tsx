import React from 'react';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAssetUrl } from '../utils/assets';

interface Character {
  id: string;
  name: string;
  spriteUrl: string;
}

interface SpriteState {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  visible: boolean;
  sayText: string;
}

interface StageProps {
  characters: Character[];
  activeCharacterId: string;
  spriteStates: Record<string, SpriteState>;
  showGrid?: boolean;
  background?: string;
  sceneTitle?: string;
  sceneTitleColor?: string;
  sceneTitleSize?: 'small' | 'medium' | 'large' | 'xlarge';
  sceneTitlePosition?: { x: number, y: number };
  disableDragging?: boolean;
  onTextClick?: () => void;
  onUpdateTextPosition?: (x: number, y: number) => void;
  onSelectCharacter?: (charId: string) => void;
  onCharacterClick?: (charId: string) => void;
  onUpdateCharacterPosition?: (charId: string, x: number, y: number) => void;
}

interface StageCharacterProps {
  key?: string;
  char: Character;
  state: SpriteState;
  isActive: boolean;
  isDragging: boolean;
  disableDragging?: boolean;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onClick?: () => void;
}

function StageCharacter({ 
  char, 
  state, 
  isActive, 
  isDragging, 
  disableDragging = false,
  onDragStart, 
  onDragMove, 
  onDragEnd,
  onClick
}: StageCharacterProps) {
  const prevPosRef = React.useRef({ x: state.x, y: state.y });
  const wrapCounterRef = React.useRef(0);
  
  const dx = Math.abs(state.x - prevPosRef.current.x);
  const dy = Math.abs(state.y - prevPosRef.current.y);
  
  // If the character wraps around (change is larger than 5 grid steps), increment the key counter to force instant remount
  if (dx > 5 || dy > 5) {
    wrapCounterRef.current += 1;
  }
  
  prevPosRef.current = { x: state.x, y: state.y };
  
  const motionKey = `${char.id}-${wrapCounterRef.current}`;

  // Percentage positioning on the responsive 20x15 grid:
  // X is 1 to 20 columns. Center of column X is (X - 0.5) * (100% / 20) = (X - 0.5) * 5%
  // Y is 1 to 15 rows (1 is bottom, 15 is top). Center of row Y is 100% - (Y - 0.5) * (100% / 15)
  const leftPercent = (state.x - 0.5) * 5;
  const topPercent = 100 - (state.y - 0.5) * (100 / 15);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only drag with left click / primary touch
    if (disableDragging) {
      onClick?.();
      return;
    }
    onDragStart();
    
    const stageEl = document.getElementById('scratch-stage');
    if (!stageEl) return;
    
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    const rect = stageEl.getBoundingClientRect();
    const cellW = rect.width / 20;
    const cellH = rect.height / 15;
    
    const startX = state.x;
    const startY = state.y;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMoved = false;
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaPxX = moveEvent.clientX - startClientX;
      const deltaPxY = moveEvent.clientY - startClientY;
      
      if (Math.abs(deltaPxX) > 3 || Math.abs(deltaPxY) > 3) hasMoved = true;
      
      const deltaGridX = deltaPxX / cellW;
      const deltaGridY = -deltaPxY / cellH; // Y is inverted in browser pixels
      
      let nextX = startX + deltaGridX;
      let nextY = startY + deltaGridY;
      
      // Bound the drag coordinate
      nextX = Math.max(0.5, Math.min(20.5, nextX));
      nextY = Math.max(0.5, Math.min(15.5, nextY));
      
      onDragMove(nextX, nextY);
    };
    
    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      if (!hasMoved) {
        onClick?.();
      }

      const deltaPxX = upEvent.clientX - startClientX;
      const deltaPxY = upEvent.clientY - startClientY;
      
      const deltaGridX = deltaPxX / cellW;
      const deltaGridY = -deltaPxY / cellH;
      
      // Snap to nearest integer on release
      let finalX = Math.round(startX + deltaGridX);
      let finalY = Math.round(startY + deltaGridY);
      
      finalX = Math.max(1, Math.min(20, finalX));
      finalY = Math.max(1, Math.min(15, finalY));
      
      onDragEnd(finalX, finalY);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <motion.div
      key={motionKey}
      initial={false}
      animate={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        rotate: state.rotation,
        scale: state.scale,
        opacity: state.visible ? 1 : 0
      }}
      transition={isDragging ? { duration: 0 } : {
        type: "tween",
        ease: "easeOut",
        duration: 0.18
      }}
      onPointerDown={handlePointerDown}
      className={cn(
        "absolute w-[15%] aspect-square -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-1 select-none transition-shadow cursor-grab active:cursor-grabbing touch-none",
        isActive ? "z-20" : "z-10"
      )}
    >
      {/* Speech Bubble */}
      {state.sayText && (
        <div 
          className="absolute bottom-[110%] left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[10px] sm:text-xs font-black py-1.5 px-3 rounded-2xl shadow-lg border border-slate-100 whitespace-nowrap animate-bounce z-30 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-white"
          dir="auto"
        >
          {state.sayText}
        </div>
      )}

      {char.spriteUrl ? (
        <img 
          src={getAssetUrl(char.spriteUrl)} 
          alt={char.name} 
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md" 
        />
      ) : (
        <Rocket className="w-2/3 h-2/3 text-sky-500 fill-sky-200" />
      )}
    </motion.div>
  );
}

export function Stage({ 
  characters, 
  activeCharacterId, 
  spriteStates, 
  showGrid = false,
  background,
  sceneTitle,
  sceneTitleColor,
  sceneTitleSize = 'medium',
  sceneTitlePosition = { x: 10.5, y: 13 },
  disableDragging = false,
  onTextClick,
  onUpdateTextPosition,
  onSelectCharacter,
  onCharacterClick,
  onUpdateCharacterPosition
}: StageProps) {
  const INITIAL_STATE: SpriteState = {
    x: 11,
    y: 8,
    rotation: 0,
    scale: 1,
    visible: true,
    sayText: ''
  };

  const [draggingCharId, setDraggingCharId] = React.useState<string | null>(null);
  const [isTextDragging, setIsTextDragging] = React.useState(false);

  const activeState = spriteStates[activeCharacterId] || INITIAL_STATE;
  const activeX = Math.round(activeState.x);
  const activeY = Math.round(activeState.y);

  // Force exactly 480x360 like Scratch Jr.
  const dimensions = { width: 480, height: 360 };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0 w-full overflow-hidden"
    >
      {/* Scratch-style Rounded Purple Frame */}
      <div className="p-4 bg-[#9575CD] rounded-[40px] border-[6px] border-[#7E57C2] shadow-[0_20px_60px_rgba(0,0,0,0.15),inset_0_-10px_20px_rgba(0,0,0,0.1)] relative">
        {/* Decorative Glossy Highlights */}
        <div className="absolute top-4 left-6 w-40 h-8 bg-white/20 rounded-full blur-md -rotate-6" />
        <div className="absolute bottom-4 right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />

        {/* Grid numbers on the purple frame */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-30 select-none">
            {/* X Labels (1 to 20) on bottom frame */}
            <div className="absolute bottom-0 left-4 right-4 h-4 flex items-center">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={`frame-x-${i}`}
                  className="absolute text-[9px] font-black text-white drop-shadow-sm"
                  style={{ left: `${(i + 0.5) * (480 / 20)}px`, transform: 'translateX(-50%)' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Y Labels (1 to 15) on left frame */}
            <div className="absolute left-0 top-4 bottom-4 w-4 flex flex-col items-center">
              {Array.from({ length: 15 }).map((_, i) => (
                <div 
                  key={`frame-y-${i}`}
                  className="absolute text-[9px] font-black text-white drop-shadow-sm"
                  style={{ top: `${(14 - i + 0.5) * (360 / 15)}px`, transform: 'translateY(-50%)', left: '4px' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 480x360 Scratch Stage Viewport */}
        <div 
          id="scratch-stage"
          style={{ width: `480px`, height: `360px` }}
          className="bg-white relative overflow-hidden rounded-[32px] border-4 border-[#7E57C2] shadow-inner shrink-0 select-none"
        >
          {/* Background image if set, else show default sky/clouds */}
        {background ? (
          <img 
            src={getAssetUrl(background)} 
            alt="Stage Background" 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
        ) : (
          <>
            {/* Background decorations (clouds) */}
            <div className="absolute top-[10%] left-[10%] w-[15%] h-[8%] bg-white rounded-full opacity-60 blur-sm pointer-events-none"></div>
            <div className="absolute top-[25%] right-[15%] w-[20%] h-[10%] bg-white rounded-full opacity-60 blur-sm pointer-events-none"></div>
          </>
        )}

        {/* Scene Title */}
        {sceneTitle && (
          <motion.div 
            className={cn(
              "absolute z-40 text-center pointer-events-auto -translate-x-1/2 -translate-y-1/2 touch-none",
              disableDragging ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
            )}
            animate={{
              left: `${(sceneTitlePosition.x - 0.5) * 5}%`,
              top: `${100 - (sceneTitlePosition.y - 0.5) * (100 / 15)}%`
            }}
            transition={isTextDragging ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 20 }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              if (disableDragging) {
                onTextClick?.();
                return;
              }
              e.preventDefault();
              setIsTextDragging(true);
              const target = e.currentTarget as HTMLElement;
              target.setPointerCapture(e.pointerId);
              
              const stageEl = document.getElementById('scratch-stage');
              if (!stageEl) return;
              
              const rect = stageEl.getBoundingClientRect();
              const cellW = rect.width / 20;
              const cellH = rect.height / 15;
              
              const startX = sceneTitlePosition.x;
              const startY = sceneTitlePosition.y;
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              let hasMoved = false;
              
              const handlePointerMove = (moveEvent: PointerEvent) => {
                const deltaPxX = moveEvent.clientX - startClientX;
                const deltaPxY = moveEvent.clientY - startClientY;
                
                if (Math.abs(deltaPxX) > 3 || Math.abs(deltaPxY) > 3) hasMoved = true;
                
                const deltaGridX = deltaPxX / cellW;
                const deltaGridY = -deltaPxY / cellH;
                
                let nextX = startX + deltaGridX;
                let nextY = startY + deltaGridY;
                
                nextX = Math.max(0.5, Math.min(20.5, nextX));
                nextY = Math.max(0.5, Math.min(15.5, nextY));
                
                onUpdateTextPosition?.(nextX, nextY);
              };
              
              const handlePointerUp = (upEvent: PointerEvent) => {
                setIsTextDragging(false);
                target.releasePointerCapture(upEvent.pointerId);
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
                if (!hasMoved) {
                  onTextClick?.();
                }
              };
              
              window.addEventListener('pointermove', handlePointerMove);
              window.addEventListener('pointerup', handlePointerUp);
            }}
          >
            <h2 
              className={cn(
                "font-black text-white",
                sceneTitleSize === 'small' ? 'text-3xl md:text-4xl' : 
                sceneTitleSize === 'large' ? 'text-6xl md:text-7xl' : 
                sceneTitleSize === 'xlarge' ? 'text-7xl md:text-8xl' : 
                'text-4xl md:text-5xl'
              )}
              style={{ 
                color: sceneTitleColor || '#ffffff',
                WebkitTextStroke: '2px #3c78b5', 
                textShadow: '2px 2px 0 #3c78b5, -1px -1px 0 #3c78b5, 1px -1px 0 #3c78b5, -1px 1px 0 #3c78b5, 1px 1px 0 #3c78b5' 
              }}
            >
              {sceneTitle}
            </h2>
          </motion.div>
        )}
        
        {/* Grid and labels overlay */}
        {showGrid && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 640 480">
            {/* Horizontal Grid Lines */}
            {Array.from({ length: 14 }).map((_, i) => {
              const y = (i + 1) * 32;
              return (
                <g key={`h-group-${i}`}>
                  {/* Subtle white "glow" line */}
                  <line 
                    x1={0} y1={y} x2={640} y2={y} 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeOpacity="0.4" 
                  />
                  {/* Primary blue line */}
                  <line 
                    x1={0} y1={y} x2={640} y2={y} 
                    stroke="#1e3a8a" 
                    strokeWidth="0.8" 
                    strokeOpacity="0.3" 
                  />
                </g>
              );
            })}
            
            {/* Vertical Grid Lines */}
            {Array.from({ length: 19 }).map((_, i) => {
              const x = (i + 1) * 32;
              return (
                <g key={`v-group-${i}`}>
                  <line 
                    x1={x} y1={0} x2={x} y2={480} 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeOpacity="0.4" 
                  />
                  <line 
                    x1={x} y1={0} x2={x} y2={480} 
                    stroke="#1e3a8a" 
                    strokeWidth="0.8" 
                    strokeOpacity="0.3" 
                  />
                </g>
              );
            })}
            
            {/* Highlight Active Character's Column (X Axis) */}
            {activeX >= 1 && activeX <= 20 && (
              <g key="badge-x">
                <line 
                  x1={(activeX - 0.5) * 32} 
                  y1={0} 
                  x2={(activeX - 0.5) * 32} 
                  y2={480} 
                  stroke="#3c78b5" 
                  strokeWidth="1.5" 
                  strokeOpacity="0.3" 
                />
                <circle 
                  cx={(activeX - 0.5) * 32} 
                  cy={468} 
                  r={12} 
                  fill="#3c78b5" 
                />
                <text
                  x={(activeX - 0.5) * 32}
                  y={471.5}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-black fill-white select-none"
                >
                  {activeX}
                </text>
              </g>
            )}

            {/* Highlight Active Character's Row (Y Axis) */}
            {activeY >= 1 && activeY <= 15 && (
              <g key="badge-y">
                <line 
                  x1={0} 
                  y1={480 - (activeY - 0.5) * 32} 
                  x2={640} 
                  y2={480 - (activeY - 0.5) * 32} 
                  stroke="#3c78b5" 
                  strokeWidth="1.5" 
                  strokeOpacity="0.3" 
                />
                <circle 
                  cx={16} 
                  cy={480 - (activeY - 0.5) * 32} 
                  r={12} 
                  fill="#3c78b5" 
                />
                <text
                  x={16}
                  y={480 - (activeY - 0.5) * 32 + 3.5}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-black fill-white select-none"
                >
                  {activeY}
                </text>
              </g>
            )}
          </svg>
        )}

        {/* Sprites Container */}
        <div className="absolute inset-0 z-20">
          {characters.map((char) => {
            const state = spriteStates[char.id] || INITIAL_STATE;
            const isActive = char.id === activeCharacterId;
            const isDragging = draggingCharId === char.id;

            return (
              <StageCharacter
                key={char.id}
                char={char}
                state={state}
                isActive={isActive}
                isDragging={isDragging}
                disableDragging={disableDragging}
                onDragStart={() => {
                  setDraggingCharId(char.id);
                  onSelectCharacter?.(char.id);
                }}
                onDragMove={(x, y) => {
                  onUpdateCharacterPosition?.(char.id, x, y);
                }}
                onDragEnd={(x, y) => {
                  setDraggingCharId(null);
                  onUpdateCharacterPosition?.(char.id, x, y);
                }}
                onClick={() => {
                  onSelectCharacter?.(char.id);
                  onCharacterClick?.(char.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
}

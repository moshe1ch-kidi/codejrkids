import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BLOCK_DEFS, BlockType, BlockCategory } from '../blocks';
import { VisualBlock } from './VisualBlock';
import { cn } from '../lib/utils';
import { getAssetUrl } from '../utils/assets';

interface PaletteProps {
  onDragStart: (e: React.PointerEvent, type: BlockType) => void;
}

const BLOCK_HEBREW_NAMES: Record<BlockType, string> = {
  START_FLAG: 'התחל בדגל',
  START_TOUCH: 'התחל בלחיצה',
  START_BUMP: 'התחל במגע',
  START_GET_MESSAGE: 'קבל מסר',
  SEND_MESSAGE: 'שלח מסר',
  MOVE_RIGHT: 'זוז ימינה',
  MOVE_LEFT: 'זוז שמאלה',
  MOVE_UP: 'זוז למעלה',
  MOVE_DOWN: 'זוז למטה',
  TURN_RIGHT: 'הסתובב ימינה',
  TURN_LEFT: 'הסתובב שמאלה',
  HOP: 'קפוץ',
  GO_HOME: 'חזרה להתחלה',
  SAY: 'אמור שלום',
  GROW: 'גדל',
  SHRINK: 'קטן',
  RESET_SIZE: 'גודל רגיל',
  HIDE: 'העלם',
  SHOW: 'הראה',
  POP: 'צליל פופ',
  PLAY_RECORDED: 'השמע הקלטה',
  WAIT: 'המתן',
  STOP: 'עצור',
  SET_SPEED: 'קבע מהירות',
  REPEAT: 'לולאה',
  REPEAT_FOREVER: 'חזור לנצח',
  END: 'סיום',
  GOTO_PAGE: 'עבור לעמוד'
};

const getBubbleStyle = (category: string) => {
  switch (category) {
    case 'EVENTS':
      return 'bg-[#fffbeb] text-[#b45309] border-[#fde68a] shadow-amber-100/40';
    case 'MOTION':
      return 'bg-[#f0f9ff] text-[#1d4ed8] border-[#bae6fd] shadow-blue-100/40';
    case 'LOOKS':
      return 'bg-[#faf5ff] text-[#6d28d9] border-[#e9d5ff] shadow-purple-100/40';
    case 'SOUND':
      return 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] shadow-green-100/40';
    case 'CONTROL':
      return 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa] shadow-orange-100/40';
    case 'END':
      return 'bg-[#fff5f5] text-[#b91c1c] border-[#fecaca] shadow-red-100/40';
    default:
      return 'bg-white text-slate-700 border-slate-200 shadow-slate-100/40';
  }
};

export function Palette({ onDragStart }: PaletteProps) {
  const [activeCategory, setActiveCategory] = useState<BlockCategory>('MOTION');

  const categories: { 
    name: BlockCategory; 
    bgColor: string; 
    activeIcon: string; 
    inactiveIcon: string; 
    blocks: BlockType[] 
  }[] = [
    { 
      name: 'EVENTS', 
      bgColor: 'bg-[#fff4cc]', 
      activeIcon: '/icons/categories/StartOn.svg', 
      inactiveIcon: '/icons/categories/StartOff.svg', 
      blocks: ['START_FLAG', 'START_TOUCH', 'START_BUMP', 'START_GET_MESSAGE', 'SEND_MESSAGE'] 
    },
    { 
      name: 'MOTION', 
      bgColor: 'bg-[#e6eff9]', 
      activeIcon: '/icons/categories/MotionOn.svg', 
      inactiveIcon: '/icons/categories/MotionOff.svg', 
      blocks: ['MOVE_RIGHT', 'MOVE_LEFT', 'MOVE_UP', 'MOVE_DOWN', 'TURN_RIGHT', 'TURN_LEFT', 'HOP', 'GO_HOME'] 
    },
    { 
      name: 'LOOKS', 
      bgColor: 'bg-[#f0e6ff]', 
      activeIcon: '/icons/categories/LooksOn.svg', 
      inactiveIcon: '/icons/categories/LooksOff.svg', 
      blocks: ['SAY', 'GROW', 'SHRINK', 'RESET_SIZE', 'HIDE', 'SHOW'] 
    },
    { 
      name: 'SOUND', 
      bgColor: 'bg-[#e6f7ec]', 
      activeIcon: '/icons/categories/SoundOn.svg', 
      inactiveIcon: '/icons/categories/SoundOff.svg', 
      blocks: ['POP', 'PLAY_RECORDED'] 
    },
    { 
      name: 'CONTROL', 
      bgColor: 'bg-[#fff0e6]', 
      activeIcon: '/icons/categories/FlowOn.svg', 
      inactiveIcon: '/icons/categories/FlowOff.svg', 
      blocks: ['WAIT', 'STOP', 'SET_SPEED', 'REPEAT'] 
    },
    { 
      name: 'END', 
      bgColor: 'bg-[#ffe6e6]', 
      activeIcon: '/icons/categories/StopOn.svg', 
      inactiveIcon: '/icons/categories/StopOff.svg', 
      blocks: ['REPEAT_FOREVER', 'END', 'GOTO_PAGE'] 
    }
  ];

  const activeCategoryData = categories.find(c => c.name === activeCategory);

  return (
    <div className="flex w-full border-b border-[#F9C17D]/30 shadow-sm h-[88px] shrink-0 bg-[#FBD5A5]">
      <div className="flex items-center gap-1.5 px-3 border-r border-[#F9C17D]/30">
        {categories.map(cat => {
          const isActive = activeCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "w-[50px] h-[56px] flex items-center justify-center transition-transform duration-150 focus:outline-none",
                isActive ? "scale-110 drop-shadow-md" : "hover:scale-105 opacity-90 hover:opacity-100"
              )}
            >
              <img 
                src={getAssetUrl(isActive ? cat.activeIcon : cat.inactiveIcon)} 
                alt={cat.name} 
                className="w-full h-full pointer-events-none select-none" 
              />
            </button>
          )
        })}
      </div>

      <div 
        className={cn(
          "flex-1 flex items-center gap-[15px] px-6 overflow-x-auto kid-scrollbar scroll-smooth", 
          activeCategoryData?.bgColor
        )}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.preventDefault();
            // Scroll horizontally in response to vertical wheel
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {activeCategoryData?.blocks.map(type => {
          const def = BLOCK_DEFS[type as BlockType];
          return (
            <div
              key={type}
              onPointerDown={(e) => onDragStart(e, type as BlockType)}
              className="touch-none cursor-grab hover:scale-105 transition-transform animate-fade-in flex flex-col items-center justify-center relative shrink-0 group"
              title={BLOCK_HEBREW_NAMES[type as BlockType] || type}
            >
              <VisualBlock 
                type={type as BlockType} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { BlockInstance, BlockType, BLOCK_DEFS } from '../blocks';
import { VisualBlock } from './VisualBlock';
import { cn } from '../lib/utils';
import { getAssetUrl } from '../utils/assets';

interface Character {
  id: string;
  name: string;
  spriteUrl: string;
}

interface WorkspaceBlockProps {
  stackId: string;
  block: BlockInstance;
  onDragStart: (e: React.PointerEvent, stackId: string, blockId: string) => void;
  onBlockClick?: (stackId: string, blockId: string) => void;
  isActive: boolean;
  onTimesChange: (id: string, times: number) => void;
  onTextChange?: (id: string, text: string) => void;
  onOpenKeypad?: (
    mode: 'number' | 'text' | 'speed' | 'character' | 'message_color',
    title: string,
    initialValue: string,
    onConfirm: (val: string) => void,
    anchorRect?: DOMRect
  ) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  isFirst?: boolean;
  characters?: Character[];
  activeCharacterId?: string;
}

const getDefaultValue = (type: BlockType): number => {
  if (type === 'HOP') return 2;
  if (type === 'WAIT') return 10;
  if (type === 'SET_SPEED') return 2;
  if (type === 'GOTO_PAGE') return 2;
  return 1;
};

export const WorkspaceBlock: React.FC<WorkspaceBlockProps> = ({ 
  stackId, 
  block, 
  onDragStart,
  onBlockClick, 
  isActive, 
  onTimesChange, 
  onTextChange,
  onOpenKeypad,
  onDelete, 
  isDragging,
  isFirst = false,
  characters,
  activeCharacterId
}) => {
  if (block.type === 'REPEAT') {
    return (
      <div 
        className={cn(
          "flex items-stretch relative touch-none transition-all duration-150", 
          isDragging ? "opacity-50" : "",
          !isFirst && "-ml-[10px]",
          isActive ? "drop-shadow-[0_0_12px_rgba(253,224,71,1)] scale-105 z-40" : "drop-shadow-sm"
        )}
        onPointerDown={(e) => {
          e.stopPropagation();
          onDragStart(e, stackId, block.id);
        }}
      >
        {isFirst && (
          <div 
            className="block-socket pointer-events-none absolute top-0 -left-4 w-8 h-full" 
            data-container-id={stackId} 
            data-after-id={`prepend-${stackId}`}
          ></div>
        )}
        <div className="w-[12px] flex flex-col shrink-0">
          <svg className="shrink-0 h-16 w-[12px] text-[#ff9900]" viewBox="0 0 12 64" fill="currentColor" preserveAspectRatio="none">
            <path d="M 8 0 L 12 0 L 12 64 L 0 64 L 0 42 A 10 10 0 0 0 0 22 L 0 8 A 8 8 0 0 1 8 0 Z" />
          </svg>
          <div className="flex-1 bg-[#ff9900] w-[12px] rounded-bl-[8px]"></div>
        </div>
        <div className="flex bg-[#ff9900] py-0 gap-1 items-start overflow-visible">
          <div className="flex flex-col items-center justify-center w-[58px] shrink-0 gap-1 h-16 overflow-visible">
            <img src={getAssetUrl("/icons/Repeat.svg")} className="w-[48px] h-[48px] pointer-events-none select-none drop-shadow-md shrink-0 max-w-none z-10" />
            <div 
               className="w-8 text-center rounded bg-[#fff0e6] text-[#cc7a00] font-bold text-xs py-0.5 cursor-text select-none hover:bg-orange-100 transition-colors border border-transparent hover:border-[#cc7a00]/30 shadow-sm shrink-0 z-10"
               onPointerDown={(e) => e.stopPropagation()}
               onClick={(e) => { 
                 e.stopPropagation(); 
                 const currentVal = block.times || 4;
                 const rect = e.currentTarget.getBoundingClientRect();
                 if (onOpenKeypad) {
                   onOpenKeypad('number', 'Select Repeats', String(currentVal), (val) => {
                     onTimesChange(block.id, parseInt(val) || 4);
                   }, rect);
                 } else {
                   const t = prompt("Repeats:", String(currentVal)); 
                   if (t !== null) {
                     const val = parseInt(t) || 4;
                     onTimesChange(block.id, val); 
                   }
                 }
               }}
            >
               {block.times || 4}
            </div>
          </div>
          <div className="flex items-start bg-[#e68a00]/40 rounded-lg min-w-[60px] min-h-[51px] mt-[6px] p-1 gap-0 border-2 border-dashed border-[#e68a00] shadow-inner mr-1 relative">
             {block.children && block.children.length > 0 ? (
                block.children.map((child, index) => (
                   <WorkspaceBlock 
                      key={child.id} 
                      stackId={stackId} 
                      block={child} 
                      onDragStart={onDragStart}
                      onBlockClick={onBlockClick}
                      isActive={isActive}
                      onTimesChange={onTimesChange}
                      onTextChange={onTextChange}
                      onOpenKeypad={onOpenKeypad}
                      onDelete={onDelete}
                      isFirst={index === 0}
                   />
                ))
             ) : (
                <div className="w-full h-full min-w-[40px] min-h-[51px] opacity-50 bg-white/20 rounded"></div>
             )}
             
             {/* Socket for INSIDE the repeat block */}
             <div className="block-socket pointer-events-none absolute top-0 left-0 w-full h-full" data-container-id={stackId} data-after-id={`repeat-inner-${block.id}`}></div>
          </div>
        </div>
        <div className="w-[20px] flex flex-col shrink-0 relative">
          <svg className="shrink-0 h-16 w-[20px] text-[#ff9900]" viewBox="0 0 20 64" fill="currentColor" preserveAspectRatio="none">
            <path d="M 0 0 L 2 0 A 8 8 0 0 1 10 8 L 10 22 A 10 10 0 0 1 10 42 L 10 56 A 8 8 0 0 1 2 64 L 0 64 Z" />
          </svg>
          <div className="flex-1 bg-[#ff9900] w-[10px] rounded-br-[8px]"></div>
          {/* Socket for AFTER the repeat block */}
          <div className="block-socket pointer-events-none absolute top-0 -right-4 w-8 h-full" data-container-id={stackId} data-after-id={block.id}></div>
        </div>
      </div>
    );
  }

  // Determine if this block type needs a parameter bubble
  const hasNumericParam = [
    'MOVE_RIGHT', 'MOVE_LEFT', 'MOVE_UP', 'MOVE_DOWN',
    'TURN_RIGHT', 'TURN_LEFT',
    'HOP', 'GROW', 'SHRINK', 'WAIT', 'GOTO_PAGE'
  ].includes(block.type);

  const hasTextParam = block.type === 'SAY';
  const hasSpeedParam = block.type === 'SET_SPEED';
  const hasCharacterParam = block.type === 'START_BUMP' && (characters?.length || 0) > 1;
  const hasMessageParam = ['START_GET_MESSAGE', 'SEND_MESSAGE'].includes(block.type);

  return (
    <div 
       className={cn(
         "relative touch-none flex flex-col items-center", 
         isDragging ? "opacity-50" : "",
         !isFirst && "-ml-[10px]"
       )}
       onPointerDown={(e) => {
         e.stopPropagation();
         onDragStart(e, stackId, block.id);
       }}
    >
      {isFirst && !['START_FLAG', 'START_TOUCH', 'START_BUMP', 'START_GET_MESSAGE'].includes(block.type) && (
        <div 
          className="block-socket pointer-events-none absolute top-0 -left-4 w-8 h-full" 
          data-container-id={stackId} 
          data-after-id={`prepend-${stackId}`}
        ></div>
      )}
      
        <div className={cn("relative transition-all duration-150", isActive ? "drop-shadow-[0_0_12px_rgba(253,224,71,1)] scale-105 z-40" : "")}>
          <VisualBlock 
            key={`${block.type}-${block.times || ''}-${block.text || ''}`}
            type={block.type} 
            times={block.times} 
            text={block.text} 
            isWorkspace 
            className="drop-shadow-md cursor-grab active:cursor-grabbing animate-none" 
          />
        
        {/* Parameter Bubble at the Bottom Center of the block */}
        {(hasNumericParam || hasTextParam || hasSpeedParam || hasCharacterParam || hasMessageParam) && (
          <div 
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex justify-center"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {hasNumericParam && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentVal = block.times !== undefined ? block.times : getDefaultValue(block.type);
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (onOpenKeypad) {
                    onOpenKeypad('number', 'Select Value', String(currentVal), (val) => {
                      onTimesChange(block.id, parseInt(val) || 1);
                    }, rect);
                  } else {
                    const input = prompt("Enter number of steps / value:", String(currentVal));
                    if (input !== null) {
                      const val = parseInt(input);
                      if (!isNaN(val) && val >= 1) {
                        onTimesChange(block.id, val);
                      }
                    }
                  }
                }}
                className="px-2.5 py-0.5 min-w-[24px] text-center bg-white text-slate-800 font-black text-[12px] rounded-full shadow-md border-2 border-slate-300 hover:border-orange-400 hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none"
              >
                {block.times !== undefined ? block.times : getDefaultValue(block.type)}
              </div>
            )}

            {hasTextParam && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentText = block.text || "Hello!";
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (onOpenKeypad) {
                    onOpenKeypad('text', 'Write Message', currentText, (val) => {
                      onTextChange?.(block.id, val);
                    }, rect);
                  } else {
                    const input = prompt("Enter text for the bubble:", currentText);
                    if (input !== null && input.trim() !== "") {
                      onTextChange?.(block.id, input.trim());
                    }
                  }
                }}
                className="px-2 py-0.5 max-w-[70px] text-center bg-white text-slate-800 font-bold text-[10px] rounded-full shadow-md border-2 border-slate-300 hover:border-orange-400 hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none truncate"
                title={block.text || "Hello!"}
              >
                {block.text || "Hello!"}
              </div>
            )}

            {hasSpeedParam && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentSpeed = block.times !== undefined ? block.times : 2;
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (onOpenKeypad) {
                    onOpenKeypad('speed', 'Select Speed', String(currentSpeed), (val) => {
                      onTimesChange(block.id, parseInt(val) || 2);
                    }, rect);
                  } else {
                    const input = prompt("Select Speed: 1 (Slow), 2 (Medium), 3 (Fast)", String(currentSpeed));
                    if (input !== null) {
                      const val = parseInt(input);
                      if ([1, 2, 3].includes(val)) {
                        onTimesChange(block.id, val);
                      }
                    }
                  }
                }}
                className="absolute bottom-2 right-4 cursor-pointer pointer-events-auto select-none hover:scale-110 active:scale-95 transition-all"
              >
                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 10 6">
                  <path d="M0,0 L10,0 L5,6 Z" />
                </svg>
              </div>
            )}

            {hasCharacterParam && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentVal = block.text || 'any';
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (onOpenKeypad) {
                    onOpenKeypad('character', 'Select Character to Touch', currentVal, (val) => {
                      onTextChange?.(block.id, val);
                    }, rect);
                  } else {
                    const input = prompt("Select Character ID (or any for all):", currentVal);
                    if (input !== null) {
                      onTextChange?.(block.id, input.trim() || 'any');
                    }
                  }
                }}
                className="px-2 py-0.5 min-w-[32px] text-center bg-white text-slate-800 font-bold text-[10px] rounded-full shadow-md border-2 border-slate-300 hover:border-orange-400 hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none flex items-center justify-center gap-1.5"
              >
                {(() => {
                  const targetId = block.text || 'any';
                  if (targetId === 'any') {
                    return (
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                    );
                  }
                  const char = characters?.find(c => c.id === targetId);
                  if (char && char.spriteUrl) {
                    return (
                      <img src={char.spriteUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0 rounded-full" />
                    );
                  }
                  return <span className="text-[8px] font-black">ALL</span>;
                })()}
                <svg className="w-2 h-2 text-slate-500 fill-current shrink-0" viewBox="0 0 10 6">
                  <path d="M0,0 L10,0 L5,6 Z" />
                </svg>
              </div>
            )}

            {hasMessageParam && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const currentColor = block.text || 'orange';
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (onOpenKeypad) {
                    onOpenKeypad('message_color', 'Select Envelope Color', currentColor, (val) => {
                      onTextChange?.(block.id, val);
                    }, rect);
                  } else {
                    const input = prompt("Select color (orange, red, yellow, green, blue, purple):", currentColor);
                    if (input !== null) {
                      onTextChange?.(block.id, input.trim().toLowerCase());
                    }
                  }
                }}
                className="w-7 h-5 bg-white rounded-md shadow-md border-2 border-slate-300 hover:border-orange-400 hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none flex items-center justify-center"
              >
                <div 
                  className={cn(
                    "w-2.5 h-2.5 rounded-full ml-0.5 shrink-0",
                    block.text === 'red' ? 'bg-red-500' :
                    block.text === 'yellow' ? 'bg-yellow-400' :
                    block.text === 'green' ? 'bg-green-500' :
                    block.text === 'blue' ? 'bg-blue-500' :
                    block.text === 'purple' ? 'bg-purple-500' :
                    'bg-orange-500'
                  )}
                />
                <svg className="w-1.5 h-1.5 text-slate-500 fill-current" viewBox="0 0 10 6">
                  <path d="M0,0 L10,0 L5,6 Z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Socket for AFTER the regular block */}
      {BLOCK_DEFS[block.type]?.category !== 'END' && (
        <div className="block-socket pointer-events-none absolute top-0 -right-4 w-8 h-full" data-container-id={stackId} data-after-id={block.id}></div>
      )}
    </div>
  );
};

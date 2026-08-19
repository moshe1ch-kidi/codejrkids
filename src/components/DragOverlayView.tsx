 import React from 'react';
import { DragState } from '../dragState';
import { VisualBlock } from './VisualBlock';
import { WorkspaceBlock } from './WorkspaceBlock';

interface DragOverlayViewProps {
  dragState: DragState | null;
  scenes?: any[];
  characters?: { id: string; name: string; spriteUrl: string; }[];
}

export function DragOverlayView({ dragState, scenes = [], characters = [] }: DragOverlayViewProps) {
  if (!dragState || !dragState.isDragging) return null;

  const draggedChar = dragState.source === 'CHARACTER' 
    ? characters.find(c => c.id === dragState.characterId)
    : null;

  return (
    <div 
      className="fixed pointer-events-none z-50 flex items-start drop-shadow-2xl opacity-95"
      style={{ left: dragState.currentX - dragState.offsetX, top: dragState.currentY - dragState.offsetY }}
    >
      {dragState.source === 'PALETTE' && dragState.blockType && (
        <VisualBlock type={dragState.blockType} />
      )}
      
      {dragState.source === 'WORKSPACE' && dragState.blocks && dragState.blocks.map((block, index) => (
        <WorkspaceBlock 
          key={block.id}
          stackId="preview"
          block={block}
          onDragStart={() => {}}
          isActive={false}
          onTimesChange={() => {}}
          onDelete={() => {}}
          isFirst={index === 0}
          scenes={scenes}
        />
      ))}

      {dragState.source === 'CHARACTER' && draggedChar && (
        <div className="w-24 h-24 bg-[#FDDE90] border-4 border-[#F57C00] rounded-3xl shadow-2xl flex flex-col items-center justify-center p-1.5 rotate-3 scale-110 animate-pulse">
          <div className="w-14 h-14 flex items-center justify-center mb-1">
            <img 
              src={draggedChar.spriteUrl} 
              alt={draggedChar.name} 
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <span className="text-[10px] font-black bg-white text-[#A07B1E] px-2 py-0.5 rounded-full truncate max-w-[90%] shadow-sm">
            {draggedChar.name}
          </span>
        </div>
      )}
    </div>
  );
}

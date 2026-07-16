 import React from 'react';
import { DragState } from '../dragState';
import { VisualBlock } from './VisualBlock';
import { WorkspaceBlock } from './WorkspaceBlock';

interface DragOverlayViewProps {
  dragState: DragState | null;
  scenes?: any[];
  characters?: any[];
}

export function DragOverlayView({ dragState, scenes = [], characters = [] }: DragOverlayViewProps) {
  if (!dragState || !dragState.isDragging) return null;

  return (
    <div 
      className="fixed pointer-events-none z-50 flex items-start drop-shadow-2xl opacity-90 scale-105"
      style={{ left: dragState.currentX - dragState.offsetX, top: dragState.currentY - dragState.offsetY }}
    >
      {dragState.source === 'PALETTE' && dragState.blockType && (
        <VisualBlock type={dragState.blockType} />
      )}
      
      {dragState.source === 'CHARACTER' && (
        <div className="w-24 h-24 bg-white/80 rounded-3xl border-4 border-[#D81B60] flex items-center justify-center shadow-2xl p-2">
          {characters.find(c => c.id === dragState.characterId) && (
            <img 
              src={characters.find(c => c.id === dragState.characterId).spriteUrl} 
              alt="" 
              className="w-16 h-16 object-contain" 
            />
          )}
        </div>
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
    </div>
  );
}

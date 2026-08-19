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

      {dragState.source === 'CHARACTER' && dragState.characterId && (() => {
        const char = characters.find(c => c.id === dragState.characterId);
        if (!char) return null;
        return (
          <img 
            src={char.spriteUrl} 
            alt={char.name} 
            className="w-20 h-20 object-contain drop-shadow-2xl pointer-events-none"
          />
        );
      })()}
    </div>
  );
}

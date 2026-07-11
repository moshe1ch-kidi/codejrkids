import React from 'react';
import { Stack, BLOCK_DEFS } from '../blocks';
import { WorkspaceBlock } from './WorkspaceBlock';

interface Character {
  id: string;
  name: string;
  spriteUrl: string;
}

interface WorkspaceProps {
  stacks: Stack[];
  activeBlockId: string | null;
  onTimesChange: (id: string, times: number) => void;
  onTextChange?: (id: string, text: string) => void;
  onOpenKeypad?: (
    mode: 'number' | 'text' | 'speed' | 'character',
    title: string,
    initialValue: string,
    onConfirm: (val: string) => void,
    anchorRect?: DOMRect
  ) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.PointerEvent, stackId: string, blockId: string) => void;
  workspaceRef: React.RefObject<HTMLDivElement>;
  characters?: Character[];
}

export function Workspace({ 
  stacks, 
  activeBlockId, 
  onTimesChange, 
  onTextChange, 
  onOpenKeypad,
  onDelete, 
  onDragStart, 
  workspaceRef,
  characters
}: WorkspaceProps) {
  return (
    <div 
       ref={workspaceRef}
       className="relative w-full h-full min-h-0 overflow-auto kid-scrollbar bg-white rounded-2xl shadow-inner border border-gray-200"
    >
      {/* Scroll canvas area spacer to ensure vertical scrolling is active right from the start */}
      <div className="absolute top-0 left-0 w-1 h-[2000px] pointer-events-none opacity-0" />

      {stacks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic font-medium pointer-events-none">
          Drag blocks here or click them from the palette to start coding!
        </div>
      )}
      
      {stacks.map((stack) => {
        const startsWithTrigger = stack.blocks.length > 0 && ['START_FLAG', 'START_TOUCH', 'START_BUMP', 'START_GET_MESSAGE'].includes(stack.blocks[0].type);
        return (
          <div 
             key={stack.id} 
             className="absolute flex items-start overflow-visible"
             style={{ left: stack.x, top: stack.y }}
          >
             {startsWithTrigger && (
               <div 
                 className="absolute -inset-x-3 -inset-y-2 bg-[#F7AC08] border border-[#d69200]/40 rounded-2xl -z-10 pointer-events-none shadow-[0_2px_8px_rgba(247,172,8,0.2)]"
               />
             )}
             {stack.blocks.map((block, index) => (
                <WorkspaceBlock 
                  key={block.id}
                  stackId={stack.id}
                  block={block}
                  onDragStart={onDragStart}
                  isActive={activeBlockId === block.id}
                  onTimesChange={onTimesChange}
                  onTextChange={onTextChange}
                  onOpenKeypad={onOpenKeypad}
                  onDelete={onDelete}
                  isFirst={index === 0}
                  characters={characters}
                />
             ))}
          </div>
        );
      })}
    </div>
  );
}

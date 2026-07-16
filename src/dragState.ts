import { BlockInstance, BlockType, Stack } from './blocks';

export interface DragState {
  isDragging: boolean;
  source: 'PALETTE' | 'WORKSPACE' | 'CHARACTER';
  blockType?: BlockType; // if source === PALETTE
  characterId?: string; // if source === CHARACTER
  times?: number; // extra data for the block
  stackId?: string; // if source === WORKSPACE
  blockId?: string; // if source === WORKSPACE
  blocks?: BlockInstance[]; // The detached blocks
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  originalStacks?: Stack[];
}

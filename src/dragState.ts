import { BlockInstance, BlockType } from './blocks';

export interface DragState {
  isDragging: boolean;
  source: 'PALETTE' | 'WORKSPACE';
  blockType?: BlockType; // if source === PALETTE
  stackId?: string; // if source === WORKSPACE
  blockId?: string; // if source === WORKSPACE
  blocks?: BlockInstance[]; // The detached blocks
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
}

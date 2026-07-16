import { BlockInstance, Stack } from './blocks';
import { v4 as uuidv4 } from 'uuid';

export function detachBlock(stacks: Stack[], stackId: string, blockId: string): { newStacks: Stack[], detachedBlocks: BlockInstance[] } {
  let detachedBlocks: BlockInstance[] = [];
  
  const processList = (list: BlockInstance[]): BlockInstance[] => {
    const idx = list.findIndex(b => b.id === blockId);
    if (idx !== -1) {
      detachedBlocks = list.slice(idx);
      return list.slice(0, idx);
    }
    return list.map(b => ({
      ...b,
      children: b.children ? processList(b.children) : undefined
    }));
  };

  let newStacks = stacks.map(stack => {
    if (stack.id === stackId) {
      return {
        ...stack,
        blocks: processList(stack.blocks)
      };
    }
    return stack;
  });
  
  newStacks = newStacks.filter(s => s.blocks.length > 0);
  return { newStacks, detachedBlocks };
}

export function attachBlock(stacks: Stack[], targetContainerId: string, insertAfterId: string, blocksToAttach: BlockInstance[]): Stack[] {
  if (insertAfterId.startsWith('prepend-')) {
    return stacks.map(stack => {
      if (stack.id === targetContainerId) {
        return {
          ...stack,
          blocks: [...blocksToAttach, ...stack.blocks]
        };
      }
      return stack;
    });
  }

  let isInner = false;
  let targetId = insertAfterId;
  
  if (insertAfterId.startsWith('repeat-inner-')) {
    isInner = true;
    targetId = insertAfterId.replace('repeat-inner-', '');
  }

  const processList = (list: BlockInstance[]): BlockInstance[] => {
    const idx = list.findIndex(b => b.id === targetId);
    if (idx !== -1) {
      if (isInner) {
        // Prepend to children
        const b = list[idx];
        return list.map((item, i) => i === idx ? { ...item, children: [...blocksToAttach, ...(item.children || [])] } : item);
      } else {
        // Insert after
        const newBlocks = [...list];
        newBlocks.splice(idx + 1, 0, ...blocksToAttach);
        return newBlocks;
      }
    }
    return list.map(b => ({
      ...b,
      children: b.children ? processList(b.children) : undefined
    }));
  };

  return stacks.map(stack => {
    if (stack.id === targetContainerId) {
      return {
        ...stack,
        blocks: processList(stack.blocks)
      };
    }
    return stack;
  });
}

export function cloneBlocks(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.map(b => ({
    ...b,
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    children: b.children ? cloneBlocks(b.children) : undefined
  }));
}

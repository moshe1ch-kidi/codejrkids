 import { BlockInstance, Stack, isTriggerBlock, isEndBlock } from './blocks';
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
  // Trigger blocks (Start on Flag, Start on Tap, Start on Bump, Receive Message) cannot attach AFTER any block!
  if (blocksToAttach.length > 0 && isTriggerBlock(blocksToAttach[0].type)) {
    return stacks;
  }

  if (insertAfterId.startsWith('prepend-')) {
    return sanitizeStacks(stacks.map(stack => {
      if (stack.id === targetContainerId) {
        return {
          ...stack,
          blocks: [...blocksToAttach, ...stack.blocks]
        };
      }
      return stack;
    }));
  }

  let isInner = false;
  let targetId = insertAfterId;
  
  if (insertAfterId.startsWith('repeat-inner-')) {
    isInner = true;
    targetId = insertAfterId.replace('repeat-inner-', '');
  }

  // Disallow attaching after an End block
  const targetStack = stacks.find(s => s.id === targetContainerId);
  if (targetStack && !isInner) {
    const findBlock = (items: BlockInstance[]): BlockInstance | undefined => {
      for (const b of items) {
        if (b.id === targetId) return b;
        if (b.children) {
          const found = findBlock(b.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const targetBlock = findBlock(targetStack.blocks);
    if (targetBlock && isEndBlock(targetBlock.type)) {
      return stacks;
    }
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

  return sanitizeStacks(stacks.map(stack => {
    if (stack.id === targetContainerId) {
      return {
        ...stack,
        blocks: processList(stack.blocks)
      };
    }
    return stack;
  }));
}

export function sanitizeStacks(stacks: Stack[]): Stack[] {
  const result: Stack[] = [];
  
  for (const stack of stacks) {
    if (!stack.blocks || stack.blocks.length <= 1) {
      result.push(stack);
      continue;
    }
    
    let currentBlocks: BlockInstance[] = [];
    let currentX = stack.x;
    let currentY = stack.y;
    let stackCounter = 0;

    for (let i = 0; i < stack.blocks.length; i++) {
      const block = stack.blocks[i];
      
      if (i > 0 && isTriggerBlock(block.type)) {
        // Trigger block found at non-head index! Push preceding blocks as a stack
        if (currentBlocks.length > 0) {
          result.push({
            id: stackCounter === 0 ? stack.id : `stack-${Date.now()}-${Math.random()}`,
            x: currentX,
            y: currentY,
            blocks: currentBlocks
          });
          stackCounter++;
          currentX += 100;
          currentY += 20;
        }
        // Start a new stack for this trigger block
        currentBlocks = [block];
      } else {
        currentBlocks.push(block);
      }

      // If this block is an End block and there are more blocks coming AFTER it in this stack,
      // end this stack right here and start a new stack for the remaining blocks!
      if (isEndBlock(block.type) && i < stack.blocks.length - 1) {
        result.push({
          id: stackCounter === 0 ? stack.id : `stack-${Date.now()}-${Math.random()}`,
          x: currentX,
          y: currentY,
          blocks: currentBlocks
        });
        stackCounter++;
        currentX += 100;
        currentY += 20;
        currentBlocks = [];
      }
    }
    
    if (currentBlocks.length > 0) {
      result.push({
        id: stackCounter === 0 ? stack.id : `stack-${Date.now()}-${Math.random()}`,
        x: currentX,
        y: currentY,
        blocks: currentBlocks
      });
    }
  }
  
  return result;
}

export function cloneBlocks(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.map(b => ({
    ...b,
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    children: b.children ? cloneBlocks(b.children) : undefined
  }));
}

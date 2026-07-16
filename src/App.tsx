import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Square, RotateCcw, Image as ImageIcon, 
  Settings2, Plus, Flag, Trash2, Rocket, Brush, X, Grid, Pencil, Monitor, Save, FolderOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { Stage } from './components/Stage';
import { Palette } from './components/Palette';
import { Workspace } from './components/Workspace';
import { DragOverlayView } from './components/DragOverlayView';
import { SpriteGallery } from './components/SpriteGallery';
import { BackgroundGallery } from './components/BackgroundGallery';
import { PaintEditor, Shape } from './components/PaintEditor';
import { KidKeypad, KeypadMode } from './components/KidKeypad';
import { TextEditorModal, FontSize } from './components/TextEditorModal';
import { RecordModal } from './components/RecordModal';
import { cn } from './lib/utils';
import { BlockType, BlockInstance, Stack } from './blocks';
import { DragState } from './dragState';
import { detachBlock, attachBlock } from './workspaceUtils';
import { getAssetUrl } from './utils/assets';

const INITIAL_SPRITE_STATE = {
  x: 11,
  y: 8,
  homeX: 11,
  homeY: 8,
  rotation: 0,
  scale: 1,
  visible: true,
  sayText: '',
  speedDelay: 100, // Default Medium
  lastAnimationDuration: 0
};

const DELAY_MS = 100; // Time between blocks (Medium)

export default function App() {
  const [scenes, setScenes] = useState<{ 
    id: string; 
    characters?: { id: string; name: string; spriteUrl: string; shapes?: Shape[] }[];
    spriteStates?: Record<string, typeof INITIAL_SPRITE_STATE>;
    characterStacks?: Record<string, Stack[]>;
    stacks: Stack[]; 
    background?: string; 
    text?: string; 
    textColor?: string; 
    textSize?: FontSize; 
    textPosition?: { x: number, y: number } 
  }[]>([
    { 
      id: 'scene-1', 
      characters: [
        { id: 'char-1', name: 'Panda', spriteUrl: getAssetUrl('/sprites/pandamain.svg') }
      ],
      spriteStates: {
        'char-1': INITIAL_SPRITE_STATE
      },
      characterStacks: {
        'char-1': []
      },
      stacks: [], 
      background: '', 
      text: '', 
      textColor: '#000000', 
      textSize: 'medium', 
      textPosition: { x: 10, y: 13 } 
    }
  ]);
  const scenesRef = useRef(scenes);
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);
  const [activeSceneId, setActiveSceneId] = useState('scene-1');
  const [isBackgroundGalleryOpen, setIsBackgroundGalleryOpen] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState('char-1');
  const [showGrid, setShowGrid] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1024, 
    height: typeof window !== 'undefined' ? window.innerHeight : 768 
  });
  const [showMobileWarning, setShowMobileWarning] = useState(true);

  useEffect(() => {
    if (!isPresentationMode) return;
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPresentationMode]);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
  const characters = activeScene?.characters || [];
  const spriteStates = activeScene?.spriteStates || {};
  const spriteState = spriteStates[activeCharacterId] || INITIAL_SPRITE_STATE;

  const updateScenes = (updater: React.SetStateAction<{ 
    id: string; 
    characters?: { id: string; name: string; spriteUrl: string; shapes?: Shape[] }[];
    spriteStates?: Record<string, typeof INITIAL_SPRITE_STATE>;
    characterStacks?: Record<string, Stack[]>;
    stacks: Stack[]; 
    background?: string; 
    text?: string; 
    textColor?: string; 
    textSize?: FontSize; 
    textPosition?: { x: number, y: number } 
  }[]>) => {
    // Update ref immediately so async code (like runBlocks) sees the change
    const next = typeof updater === 'function' ? (updater as any)(scenesRef.current) : updater;
    scenesRef.current = next;
    
    // Then trigger React state update
    setScenes(next);
  };

  const resetStage = () => {
    console.log('Resetting stage...');
    shouldStopRef.current = true;
    setIsRunning(false);
    setActiveBlockId(null);
    activeRunsCountRef.current = 0;
    runningStacksRef.current.clear();
    setSpriteStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        const current = next[key] || INITIAL_SPRITE_STATE;
        const hX = current.homeX !== undefined ? current.homeX : INITIAL_SPRITE_STATE.x;
        const hY = current.homeY !== undefined ? current.homeY : INITIAL_SPRITE_STATE.y;
        next[key] = {
          ...INITIAL_SPRITE_STATE,
          x: hX,
          y: hY,
          homeX: hX,
          homeY: hY,
          sayText: '',
          lastAnimationDuration: 0
        };
      });
      return next;
    });
  };

  const setCharacters = (updater: React.SetStateAction<{ id: string; name: string; spriteUrl: string; shapes?: Shape[] }[]>) => {
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId) {
        const currentChars = s.characters || [];
        const nextChars = typeof updater === 'function' ? (updater as any)(currentChars) : updater;
        return { ...s, characters: nextChars };
      }
      return s;
    }));
  };

  const setSpriteStates = (updater: React.SetStateAction<Record<string, typeof INITIAL_SPRITE_STATE>>) => {
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId) {
        const currentStates = s.spriteStates || {};
        const nextStates = typeof updater === 'function' ? (updater as any)(currentStates) : updater;
        return { ...s, spriteStates: nextStates };
      }
      return s;
    }));
  };

  const setSpriteState = (updater: React.SetStateAction<typeof INITIAL_SPRITE_STATE>) => {
    setSpriteStates(prevMap => {
      const current = prevMap[activeCharacterId] || INITIAL_SPRITE_STATE;
      const next = typeof updater === 'function' ? (updater as any)(current) : { ...updater };
      
      // Wrap-around logic in grid coordinates:
      // X coordinates are columns 1 to 20.
      // Y coordinates are rows 1 to 15.
      // If a character moves beyond column 22, it wraps to -1 (offscreen left).
      // If a character moves below column -1, it wraps to 22 (offscreen right).
      // If a character moves beyond row 17, it wraps to -1 (offscreen bottom).
      // If a character moves below row -1, it wraps to 17 (offscreen top).
      const MIN_X = -1;
      const MAX_X = 22;
      const MIN_Y = -1;
      const MAX_Y = 17;

      if (next.x > MAX_X) {
        next.x = MIN_X;
      } else if (next.x < MIN_X) {
        next.x = MAX_X;
      }

      if (next.y > MAX_Y) {
        next.y = MIN_Y;
      } else if (next.y < MIN_Y) {
        next.y = MAX_Y;
      }

      return {
        ...prevMap,
        [activeCharacterId]: next
      };
    });
  };

  const setSpriteStateForChar = (charId: string, updater: React.SetStateAction<typeof INITIAL_SPRITE_STATE>) => {
    setSpriteStates(prevMap => {
      const current = prevMap[charId] || INITIAL_SPRITE_STATE;
      const next = typeof updater === 'function' ? (updater as any)(current) : { ...updater };
      
      const MIN_X = -1;
      const MAX_X = 22;
      const MIN_Y = -1;
      const MAX_Y = 17;

      if (next.x > MAX_X) {
        next.x = MIN_X;
      } else if (next.x < MIN_X) {
        next.x = MAX_X;
      }

      if (next.y > MAX_Y) {
        next.y = MIN_Y;
      } else if (next.y < MIN_Y) {
        next.y = MAX_Y;
      }

      return {
        ...prevMap,
        [charId]: next
      };
    });
  };

  const [isRunning, setIsRunning] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isPaintEditorOpen, setIsPaintEditorOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  
  // Custom Kid-Friendly Keypad State
  const [keypadConfig, setKeypadConfig] = useState<{
    isOpen: boolean;
    mode: KeypadMode;
    title: string;
    initialValue: string;
    onConfirm: (val: string) => void;
    anchorRect?: DOMRect;
  }>({
    isOpen: false,
    mode: 'number',
    title: '',
    initialValue: '',
    onConfirm: () => {}
  });

  const handleOpenKeypad = (
    mode: KeypadMode,
    title: string,
    initialValue: string,
    onConfirm: (val: string) => void,
    anchorRect?: DOMRect
  ) => {
    setKeypadConfig({
      isOpen: true,
      mode,
      title,
      initialValue,
      onConfirm,
      anchorRect
    });
  };
  
  const stacks = activeScene?.characterStacks?.[activeCharacterId] || activeScene?.stacks || [];

  const setStacks = (action: React.SetStateAction<Stack[]>) => {
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId) {
        const currentStacks = s.characterStacks?.[activeCharacterId] || s.stacks || [];
        const nextStacks = typeof action === 'function' ? (action as any)(currentStacks) : action;
        const nextCharacterStacks = {
          ...(s.characterStacks || {}),
          [activeCharacterId]: nextStacks
        };
        return { 
          ...s, 
          characterStacks: nextCharacterStacks,
          stacks: nextStacks 
        };
      }
      return s;
    }));
  };

  const shouldStopRef = useRef(false);
  const delayMsRef = useRef(DELAY_MS);
  const autoPlayNextSceneRef = useRef<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const activeRunsCountRef = useRef(0);
  const runningStacksRef = useRef<Set<string>>(new Set());

  // --- Drag and Drop State ---
  const [dragState, setDragState] = useState<DragState | null>(null);
  const snapTargetRef = useRef<{ containerId: string; afterId: string } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState?.isDragging) return;
      
      setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);

      // Find snap target
      document.querySelectorAll('.block-socket').forEach(el => el.classList.remove('bg-yellow-400', 'opacity-50'));
      snapTargetRef.current = null;

      const sockets = document.querySelectorAll('.block-socket');
      let closest: Element | null = null;
      let minDistance = 60; // snap threshold in px

      sockets.forEach(socket => {
        const containerId = (socket as HTMLElement).dataset.containerId;
        if (containerId === 'preview') return; // Ignore sockets belonging to the dragging preview

        const rect = socket.getBoundingClientRect();
        // Socket center
        const sx = rect.left + rect.width / 2;
        const sy = rect.top + rect.height / 2;
        
        // Drag pointer pos (maybe offset to the left edge of the dragged block)
        // Let's use the pointer position for snapping
        const px = e.clientX;
        const py = e.clientY;

        const dx = Math.abs(sx - px);
        const dy = Math.abs(sy - py);

        // Snapping only occurs if the block is vertically close to the row (dy < 28px)
        // and horizontally reasonably close (dx < 60px)
        if (dy < 28 && dx < 60) {
          const dist = Math.hypot(dx, dy);
          if (dist < minDistance) {
            minDistance = dist;
            closest = socket;
          }
        }
      });

      if (closest) {
        (closest as Element).classList.add('bg-yellow-400', 'opacity-50');
        snapTargetRef.current = {
          containerId: (closest as HTMLElement).dataset.containerId!,
          afterId: (closest as HTMLElement).dataset.afterId!
        };
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragState?.isDragging) return;

      document.querySelectorAll('.block-socket').forEach(el => el.classList.remove('bg-yellow-400', 'opacity-50'));
      
      const target = snapTargetRef.current;
      const workspaceRect = workspaceRef.current?.getBoundingClientRect();

      let finalBlocks: BlockInstance[] = [];
      const wasClick = dragState.source === 'WORKSPACE' && 
                       Math.abs(e.clientX - dragState.startX) < 5 && 
                       Math.abs(e.clientY - dragState.startY) < 5;

      if (dragState.source === 'PALETTE' && dragState.blockType) {
        const newBlock: BlockInstance = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: dragState.blockType,
        };
        
        if (dragState.times !== undefined) {
          newBlock.times = dragState.times;
        } else if (['MOVE_RIGHT', 'MOVE_LEFT', 'MOVE_UP', 'MOVE_DOWN', 'TURN_RIGHT', 'TURN_LEFT', 'GROW', 'SHRINK'].includes(dragState.blockType)) {
          newBlock.times = 1;
        } else if (dragState.blockType === 'HOP') {
          newBlock.times = 2;
        } else if (dragState.blockType === 'WAIT') {
          newBlock.times = 10;
        } else if (dragState.blockType === 'SET_SPEED') {
          newBlock.times = 2;
        } else if (dragState.blockType === 'SAY') {
          newBlock.text = 'Hello!';
        } else if (dragState.blockType === 'REPEAT') {
          newBlock.times = 4;
          newBlock.children = [];
        } else if (dragState.blockType === 'GOTO_PAGE') {
          newBlock.times = 2;
        } else if (['START_GET_MESSAGE', 'SEND_MESSAGE'].includes(dragState.blockType)) {
          newBlock.text = 'orange';
        }
        finalBlocks = [newBlock];
      } else if (dragState.source === 'WORKSPACE' && dragState.blocks) {
        finalBlocks = dragState.blocks;
      }

      if (wasClick && dragState.originalStacks) {
        setStacks(dragState.originalStacks);
        const originalStack = dragState.originalStacks.find(s => s.id === dragState.stackId);
        if (originalStack && activeCharacterId) {
          runTracked(originalStack.blocks, activeCharacterId);
        }
        setDragState(null);
        snapTargetRef.current = null;
        return;
      }

      if (finalBlocks.length > 0) {
        if (target) {
          setStacks(prev => attachBlock(prev, target.containerId, target.afterId, finalBlocks));
        } else if (workspaceRect) {
          // Drop on workspace background
          const x = e.clientX - workspaceRect.left - dragState.offsetX;
          const y = e.clientY - workspaceRect.top - dragState.offsetY;
          
          // Only drop if within workspace bounds (mostly)
          if (x > -100 && y > -100 && x < workspaceRect.width && y < workspaceRect.height) {
            const newStack: Stack = {
              id: `stack-${Date.now()}`,
              x: Math.max(0, x),
              y: Math.max(0, y),
              blocks: finalBlocks
            };
            setStacks(prev => [...prev, newStack]);
          }
        }
      }

      setDragState(null);
      snapTargetRef.current = null;
    };

    if (dragState?.isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);
  
  useEffect(() => {
    if (autoPlayNextSceneRef.current === activeSceneId) {
      autoPlayNextSceneRef.current = null;
      setTimeout(() => {
        playScene();
      }, 100);
    }
  }, [activeSceneId]);

  useEffect(() => {
    const scene = scenes.find(s => s.id === activeSceneId);
    if (scene && scene.characters && scene.characters.length > 0) {
      const exists = scene.characters.some(c => c.id === activeCharacterId);
      if (!exists) {
        setActiveCharacterId(scene.characters[0].id);
      }
    }
  }, [activeSceneId, scenes, activeCharacterId]);

  const handlePaletteDragStart = (e: React.PointerEvent, type: BlockType, times?: number) => {
    setDragState({
      isDragging: true,
      source: 'PALETTE',
      blockType: type,
      times: times,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: 20, // rough offset
      offsetY: 20
    });
  };

  const handleWorkspaceDragStart = (e: React.PointerEvent, stackId: string, blockId: string) => {
    // We need to find the block's current client rect to get the exact offset!
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    setStacks(prev => {
      const { newStacks, detachedBlocks } = detachBlock(prev, stackId, blockId);
      
      setTimeout(() => {
        setDragState({
          isDragging: true,
          source: 'WORKSPACE',
          stackId,
          blockId,
          blocks: detachedBlocks,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          originalStacks: prev
        });
      }, 0);
      
      return newStacks;
    });
  };

  // --- /Drag and Drop State ---

  const handleTimesChange = (id: string, times: number) => {
    const updateTimes = (items: BlockInstance[]): BlockInstance[] => {
      return items.map(b => {
        if (b.id === id) return { ...b, times };
        if (b.children) return { ...b, children: updateTimes(b.children) };
        return b;
      });
    };
    setStacks(prev => prev.map(s => ({ ...s, blocks: updateTimes(s.blocks) })));
  };

  const handleTextChange = (id: string, text: string) => {
    const updateText = (items: BlockInstance[]): BlockInstance[] => {
      return items.map(b => {
        if (b.id === id) return { ...b, text };
        if (b.children) return { ...b, children: updateText(b.children) };
        return b;
      });
    };
    setStacks(prev => prev.map(s => ({ ...s, blocks: updateText(s.blocks) })));
  };

  const handleDeleteBlock = (blockId: string) => {
    // Handled by dragging into the void, or add a specific trash zone later.
  };

  const clearWorkspace = () => {
    setStacks([]);
    resetStage();
  };

  const handleAddScene = () => {
    const newSceneId = `scene-${Date.now()}`;
    const defaultCharId = `char-${Date.now()}`;
    const defaultChar = { id: defaultCharId, name: 'Tick', spriteUrl: getAssetUrl('/sprites/cat1.svg') };
    
    updateScenes([...scenes, { 
      id: newSceneId, 
      characters: [defaultChar],
      spriteStates: {
        [defaultCharId]: INITIAL_SPRITE_STATE
      },
      characterStacks: {
        [defaultCharId]: []
      },
      stacks: [], 
      background: '' 
    }]);
    setActiveSceneId(newSceneId);
    setActiveCharacterId(defaultCharId);
  };

  const handleDeleteScene = (id: string) => {
    if (scenes.length <= 1) return;
    updateScenes(prev => prev.filter(s => s.id !== id));
    if (activeSceneId === id) {
      const remaining = scenes.filter(s => s.id !== id);
      setActiveSceneId(remaining[0].id);
    }
  };

  const handleSelectBackground = (bg: { name: string; url: string }) => {
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId) {
        return { ...s, background: bg.url };
      }
      return s;
    }));
    setIsBackgroundGalleryOpen(false);
  };

  const handleSelectSprite = (sprite: { name: string; url: string }) => {
    const newCharId = `char-${Date.now()}`;
    setCharacters(prev => [...prev, { id: newCharId, name: sprite.name, spriteUrl: sprite.url }]);
    setSpriteStates(prev => ({
      ...prev,
      [newCharId]: INITIAL_SPRITE_STATE
    }));
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId) {
        return {
          ...s,
          characterStacks: {
            ...(s.characterStacks || {}),
            [newCharId]: []
          }
        };
      }
      return s;
    }));
    setActiveCharacterId(newCharId);
    setIsGalleryOpen(false);
  };

  const handleDeleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (characters.length <= 1) return;
    setCharacters(prev => prev.filter(c => c.id !== id));
    setSpriteStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    updateScenes(prev => prev.map(s => {
      if (s.id === activeSceneId && s.characterStacks) {
        const nextStacks = { ...s.characterStacks };
        delete nextStacks[id];
        return { ...s, characterStacks: nextStacks };
      }
      return s;
    }));
    if (activeCharacterId === id) {
      const remaining = characters.filter(c => c.id !== id);
      setActiveCharacterId(remaining[0].id);
    }
  };

  const handleUpdateCharacterName = (id: string, newName: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    setKeypadConfig(prev => ({ ...prev, isOpen: false }));
  };

  const triggerBumpEvents = (sourceId: string, targetId: string) => {
    const activeScene = scenesRef.current.find(s => s.id === activeSceneId);
    if (!activeScene) return;
    
    const characterStacks = activeScene.characterStacks || {};
    const targetStacks = characterStacks[targetId] || [];
    
    targetStacks.forEach(s => {
      const firstBlock = s.blocks[0];
      if (firstBlock && firstBlock.type === 'START_BUMP') {
        const triggerCharId = firstBlock.text || 'any';
        if (triggerCharId === 'any' || triggerCharId === sourceId) {
          runTracked(s.blocks, targetId);
        }
      }
    });
  };

  const checkForCollisions = (movingCharId: string) => {
    const activeScene = scenesRef.current.find(s => s.id === activeSceneId);
    if (!activeScene || !activeScene.spriteStates) return;

    const movingCharState = activeScene.spriteStates[movingCharId];
    if (!movingCharState) return;

    Object.entries(activeScene.spriteStates).forEach(([otherCharId, otherState]) => {
      if (movingCharId === otherCharId) return;
      
      const other = otherState as typeof INITIAL_SPRITE_STATE;
      
      // Simple distance check in grid units
      const dx = movingCharState.x - other.x;
      const dy = movingCharState.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If distance is less than 1.2 grid units (considering character size)
      if (distance < 1.2) {
        triggerBumpEvents(movingCharId, otherCharId);
        triggerBumpEvents(otherCharId, movingCharId);
      }
    });
  };

  const runBlocks = async (blockList: BlockInstance[], charId: string = activeCharacterId, isForever: boolean = false) => {
    const endsWithForever = blockList.length > 0 && blockList[blockList.length - 1].type === 'REPEAT_FOREVER';
    
    if (endsWithForever) {
      const loopBlocks = blockList.slice(0, -1);
      const foreverBlock = blockList[blockList.length - 1];
      
      while (!shouldStopRef.current) {
        for (const block of loopBlocks) {
          if (shouldStopRef.current) break;
          await runBlocks([block], charId, true);
        }
        if (shouldStopRef.current) break;
        
        // Highlight the REPEAT_FOREVER block to show loop-back feedback
        setActiveBlockId(foreverBlock.id);
        setActiveBlockId(null);
      }
      return;
    }

    for (const block of blockList) {
      if (shouldStopRef.current) break;
      
      setActiveBlockId(block.id);
      
      // Get the character's specific speed
      const charState = (scenesRef.current.find(s => s.id === activeSceneId)?.spriteStates?.[charId]) || INITIAL_SPRITE_STATE;
      const charDelay = charState.speedDelay !== undefined ? charState.speedDelay : 100;
      const GAP_COMPENSATION = 20; // ms

      switch (block.type) {
        case 'MOVE_RIGHT': {
          const steps = block.times !== undefined ? block.times : 1;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            x: prev.x + steps,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          checkForCollisions(charId);
          break;
        }
        case 'MOVE_LEFT': {
          const steps = block.times !== undefined ? block.times : 1;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            x: prev.x - steps,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          checkForCollisions(charId);
          break;
        }
        case 'MOVE_UP': {
          const steps = block.times !== undefined ? block.times : 1;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            y: prev.y + steps,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          checkForCollisions(charId);
          break;
        }
        case 'MOVE_DOWN': {
          const steps = block.times !== undefined ? block.times : 1;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            y: prev.y - steps,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          checkForCollisions(charId);
          break;
        }
        case 'TURN_RIGHT': {
          const steps = block.times !== undefined ? block.times : 1;
          const rotationAmount = steps * 30;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            rotation: prev.rotation + rotationAmount,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          break;
        }
        case 'TURN_LEFT': {
          const steps = block.times !== undefined ? block.times : 1;
          const rotationAmount = steps * 30;
          const totalDuration = charDelay * steps;
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            rotation: prev.rotation - rotationAmount,
            lastAnimationDuration: (totalDuration + GAP_COMPENSATION) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, totalDuration - GAP_COMPENSATION)));
          break;
        }
        case 'HOP': {
          const height = block.times !== undefined ? block.times : 2;
          // Hop is two stages: Up then Down. 
          // For HOP, we use a smaller compensation to avoid cutting off the peak too much.
          const HOP_COMP = Math.min(10, GAP_COMPENSATION);
          // Increase base delay for hop to make it more visible
          const hopDuration = charDelay + 150; 
          
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            y: prev.y + height, 
            lastAnimationDuration: (hopDuration + HOP_COMP) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, hopDuration - HOP_COMP)));
          checkForCollisions(charId);
          
          setSpriteStateForChar(charId, prev => ({ 
            ...prev, 
            y: prev.y - height, 
            lastAnimationDuration: (hopDuration + HOP_COMP) / 1000 
          }));
          await new Promise(r => setTimeout(r, Math.max(0, hopDuration - HOP_COMP)));
          checkForCollisions(charId);
          break;
        }
        case 'GO_HOME':
          setSpriteStateForChar(charId, prev => ({ ...prev, x: prev.homeX !== undefined ? prev.homeX : 11, y: prev.homeY !== undefined ? prev.homeY : 8, rotation: 0 }));
          break;
        case 'SAY': {
          const text = block.text || 'Hello!';
          setSpriteStateForChar(charId, prev => ({ ...prev, sayText: text }));
          await new Promise(r => setTimeout(r, 2000));
          setSpriteStateForChar(charId, prev => ({ ...prev, sayText: '' }));
          break;
        }
        case 'GROW': {
          const amount = block.times !== undefined ? block.times : 1;
          setSpriteStateForChar(charId, prev => ({ ...prev, scale: prev.scale + (amount * 0.15) }));
          break;
        }
        case 'SHRINK': {
          const amount = block.times !== undefined ? block.times : 1;
          setSpriteStateForChar(charId, prev => ({ ...prev, scale: Math.max(0.15, prev.scale - (amount * 0.15)) }));
          break;
        }
        case 'RESET_SIZE':
          setSpriteStateForChar(charId, prev => ({ ...prev, scale: 1 }));
          break;
        case 'HIDE':
          setSpriteStateForChar(charId, prev => ({ ...prev, visible: false }));
          break;
        case 'SHOW':
          setSpriteStateForChar(charId, prev => ({ ...prev, visible: true }));
          break;
        case 'POP': {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
            
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (err) {
            console.log('Audio error:', err);
          }
          break;
        }
        case 'PLAY_RECORDED': {
          const recordingId = block.times !== undefined ? block.times : 1;
          const url = recordings[recordingId];
          if (url) {
            try {
              const audio = new Audio(url);
              await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                audio.play().catch((err) => {
                  console.log('Error playing recording:', err);
                  resolve();
                });
              });
            } catch (err) {
              console.log('Audio error:', err);
            }
          }
          break;
        }
        case 'WAIT': {
          const tenths = block.times !== undefined ? block.times : 10;
          await new Promise(r => setTimeout(r, tenths * 100));
          break;
        }
        case 'SET_SPEED': {
          const speed = block.times !== undefined ? block.times : 2;
          let newDelay = 100;
          if (speed === 1) {
            newDelay = 300; // Slow
          } else if (speed === 3) {
            newDelay = 50; // Fast
          } else {
            newDelay = 100; // Medium
          }
          setSpriteStateForChar(charId, prev => ({ ...prev, speedDelay: newDelay }));
          break;
        }
        case 'REPEAT':
          if (block.children && block.children.length > 0) {
            for (let i = 0; i < (block.times || 4); i++) {
              if (shouldStopRef.current) break;
              await runBlocks(block.children, charId, isForever);
            }
          }
          break;
        case 'REPEAT_FOREVER':
          if (block.children) {
            while (!shouldStopRef.current) {
              if (block.children.length > 0) {
                await runBlocks(block.children, charId, true);
              } else {
                await new Promise(r => setTimeout(r, 50));
              }
            }
          }
          break;
        case 'STOP':
          shouldStopRef.current = true;
          break;
        case 'SEND_MESSAGE': {
          const color = block.text || 'orange';
          broadcastMessage(color);
          break;
        }
        case 'END':
          return;
        case 'GOTO_PAGE': {
          const targetIndex = block.times !== undefined ? block.times : 2;
          const targetSceneIndex = targetIndex - 1;
          const targetScene = scenes[targetSceneIndex];
          if (targetScene) {
            autoPlayNextSceneRef.current = targetScene.id;
            shouldStopRef.current = true;
            setActiveSceneId(targetScene.id);
          }
          break;
        }
      }
      
      if (block.type !== 'REPEAT' && block.type !== 'REPEAT_FOREVER' && 
          block.type !== 'MOVE_RIGHT' && block.type !== 'MOVE_LEFT' && 
          block.type !== 'MOVE_UP' && block.type !== 'MOVE_DOWN' &&
          block.type !== 'TURN_RIGHT' && block.type !== 'TURN_LEFT' &&
          block.type !== 'GOTO_PAGE') {
        await new Promise(r => setTimeout(r, delayMsRef.current));
      }
      setActiveBlockId(null);
    }
  };

  const runTracked = async (blocks: BlockInstance[], charId: string) => {
    if (blocks.length === 0) return;
    
    // Create a unique key for this stack for this character
    const stackId = `${charId}-${blocks[0].id}`;
    
    // If this specific stack is already running for this character, don't start it again
    if (runningStacksRef.current.has(stackId)) {
      return;
    }

    if (activeRunsCountRef.current === 0) {
      shouldStopRef.current = false;
    }
    activeRunsCountRef.current++;
    runningStacksRef.current.add(stackId);
    setIsRunning(true);
    try {
      await runBlocks(blocks, charId);
    } finally {
      activeRunsCountRef.current--;
      runningStacksRef.current.delete(stackId);
      if (activeRunsCountRef.current <= 0) {
        activeRunsCountRef.current = 0;
        setIsRunning(false);
        setActiveBlockId(null);
      }
    }
  };

  const broadcastMessage = (color: string) => {
    if (shouldStopRef.current) return;
    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
    const characterStacks = activeScene.characterStacks || {};
    
    characters.forEach(char => {
      const charStacks = characterStacks[char.id] || [];
      const getMsgStacks = charStacks.filter(s => {
        const first = s.blocks[0];
        return first && first.type === 'START_GET_MESSAGE' && (first.text || 'orange') === color;
      });
      
      getMsgStacks.forEach(s => {
        runTracked(s.blocks, char.id);
      });
    });
  };

  const handleSaveProject = () => {
    const projectData = {
      format: "scratchjr-web",
      version: 1,
      scenes,
      activeSceneId,
      activeCharacterId
    };
    
    const blob = new Blob([JSON.stringify(projectData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.sjr";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const projectData = JSON.parse(text);
        
        if (projectData.format === "scratchjr-web") {
          updateScenes(projectData.scenes || []);
          setActiveSceneId(projectData.activeSceneId || 'scene-1');
          setActiveCharacterId(projectData.activeCharacterId || 'char-1');
        } else {
          alert("Unsupported file format. Please choose a file created with this application.");
        }
      } catch (err) {
        alert("Error loading the file.");
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  const playScene = () => {
    resetStage();
    
    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
    const characterStacks = activeScene.characterStacks || {};
    
    characters.forEach(char => {
      const charStacks = characterStacks[char.id] || [];
      const startStacks = charStacks.filter(s => s.blocks[0]?.type === 'START_FLAG');
      
      const stacksToRun = startStacks.length > 0 
        ? startStacks 
        : charStacks.filter(s => 
            s.blocks[0]?.type !== 'START_TOUCH' && 
            s.blocks[0]?.type !== 'START_BUMP' &&
            s.blocks[0]?.type !== 'START_GET_MESSAGE'
          );
      
      stacksToRun.forEach(s => {
        runTracked(s.blocks, char.id);
      });
    });
  };

  const stopScene = () => {
    shouldStopRef.current = true;
    setIsRunning(false);
    setActiveBlockId(null);
    resetStage();
  };

  const handleCharacterClick = (charId: string) => {
    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
    const characterStacks = activeScene.characterStacks || {};
    
    // 1. Get the stacks of the character that was clicked (for START_TOUCH)
    const clickedCharStacks = characterStacks[charId] || [];
    const touchStacks = clickedCharStacks.filter(s => s.blocks[0]?.type === 'START_TOUCH');
    
    // 2. Also handle START_BUMP:
    characters.forEach(c => {
      if (c.id === charId) return;
      triggerBumpEvents(charId, c.id);
    });

    touchStacks.forEach(s => {
      runTracked(s.blocks, charId);
    });
  };


  return (
    <div className="h-screen max-h-screen bg-[#F4EFE6] flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="bg-white h-16 flex items-center justify-between z-20 relative px-6 shadow-sm border-b border-[#e5dfd3]">
        <div className="flex items-center gap-4 w-48 shrink-0">
          <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center shadow-sm">
             <Rocket className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">CODEJR</h1>
        </div>
        
        <div className="flex items-center justify-center gap-4 absolute left-1/2 -translate-x-1/2">
          <button 
            onClick={() => setIsBackgroundGalleryOpen(true)}
            className="hover:scale-110 transition-transform"
            title="Choose Background"
          >
            <img src={getAssetUrl("/UI/scene1.svg")} alt="Background" className="w-[72px] h-[72px] object-contain" />
          </button>
          
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              "transition-transform hover:scale-110",
              showGrid ? "scale-110 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" : ""
            )}
            title="Show/Hide Grid"
          >
            <img src={getAssetUrl("/UI/gridOn.svg")} alt="Grid" className="w-[72px] h-[72px] object-contain" />
          </button>

          <button 
            onClick={() => setIsTextModalOpen(true)}
            className="hover:scale-110 transition-transform"
            title="Add Text"
          >
            <img src={getAssetUrl("/UI/addText.svg")} alt="Text" className="w-[72px] h-[72px] object-contain" />
          </button>

          <button 
            onClick={() => setIsPresentationMode(true)}
            className="hover:scale-110 transition-transform"
            title="Full Screen"
          >
            <img src={getAssetUrl("/UI/fullOff2.svg")} alt="Full Screen" className="w-[72px] h-[72px] object-contain" />
          </button>

          <div className="w-px h-10 bg-gray-300 mx-2"></div>

          <button 
            onClick={resetStage}
            className="hover:scale-110 transition-transform"
            title="Reset Stage"
          >
            <img src={getAssetUrl("/UI/resetAll.svg")} alt="Reset" className="w-[72px] h-[72px] object-contain" />
          </button>
          <button 
            onClick={stopScene}
            disabled={!isRunning}
            className="hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            title="Stop"
          >
            <img src={getAssetUrl("/UI/stop1.svg")} alt="Stop" className="w-[72px] h-[72px] object-contain" />
          </button>
          <button 
            onClick={playScene}
            disabled={isRunning || stacks.length === 0}
            className="hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go"
          >
            <img src={getAssetUrl("/UI/go.svg")} alt="Go" className="w-[72px] h-[72px] object-contain" />
          </button>

          <div className="w-px h-10 bg-gray-300 mx-2"></div>

          <button 
            onClick={handleSaveProject}
            className="w-[72px] h-[72px] flex items-center justify-center hover:scale-110 transition-transform"
            title="Save Project"
          >
            <Save className="w-12 h-12 text-orange-400 stroke-[2]" />
          </button>
          
          <label 
            className="w-[72px] h-[72px] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
            title="Load Project"
          >
            <FolderOpen className="w-12 h-12 text-green-500 stroke-[2]" />
            <input 
              type="file" 
              accept=".sjr" 
              onChange={handleLoadProject} 
              className="hidden" 
            />
          </label>
        </div>
        
        <div className="w-48 shrink-0"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-[1700px] mx-auto w-full p-4 gap-4 min-h-0 overflow-y-auto kid-scrollbar">
        
        {/* Top Half: Stage & Scenes */}
        <div className="flex-1 flex gap-6 min-h-[460px] shrink-0 overflow-hidden">
          {/* Left Sidebar: Characters */}
          <div className="w-64 bg-[#FBD5A5] rounded-[32px] flex flex-col items-center py-4 gap-3 border-4 border-[#F9C17D] shadow-inner shrink-0 animate-fade-in overflow-hidden h-fit">
            {/* Scrollable list of characters */}
            <div className={cn(
              "w-full kid-scrollbar flex flex-col gap-2 px-1 min-h-0 shrink-0 items-center pb-2",
              characters.length > 3 ? "overflow-y-auto h-[304px]" : "overflow-y-hidden h-fit"
            )}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsGalleryOpen(true)}
                className="w-12 h-12 bg-[#7CB342] border-4 border-[#558B2F] rounded-2xl flex items-center justify-center shadow-lg text-white mt-1 shrink-0 sticky top-1 z-30 mb-2"
                title="Add Character"
              >
                <Plus className="w-7 h-7 stroke-[3]" />
              </motion.button>

              {characters.map((char) => {
                const isActive = char.id === activeCharacterId;
                return (
                  <div key={char.id} className="w-full px-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveCharacterId(char.id)}
                      className={cn(
                        "w-full h-24 rounded-3xl flex flex-col items-center justify-center relative transition-all duration-200 border-4 cursor-pointer",
                        isActive 
                          ? "bg-[#D81B60] border-[#AD1457] shadow-lg scale-105 z-10" 
                          : "bg-white/40 border-transparent hover:bg-white/60"
                      )}
                    >
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-1 overflow-hidden border-2 border-white/40 shadow-inner">
                        <img src={char.spriteUrl} alt={char.name} className="w-10 h-10 object-contain" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-full truncate max-w-[90%] shadow-sm",
                        isActive ? "bg-white text-[#D81B60]" : "bg-white/80 text-gray-700"
                      )}>
                        {char.name}
                      </span>
                      {isActive && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCharacterId(char.id);
                              setIsPaintEditorOpen(true);
                            }}
                            className="absolute top-1 right-1 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center z-20"
                            title="Edit Character"
                          >
                            <Pencil className="w-4 h-4 text-white" />
                          </button>
                          {characters.length > 1 && (
                            <button 
                              onClick={(e) => handleDeleteCharacter(char.id, e)}
                              className="absolute top-1 left-1 w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm z-20"
                              title="Delete Character"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          <Stage 
            key={activeSceneId}
            characters={characters} 
            activeCharacterId={activeCharacterId} 
            activeSceneId={activeSceneId}
            spriteStates={spriteStates} 
            showGrid={showGrid}
            background={activeScene?.background}
            sceneTitle={activeScene?.text}
            sceneTitleColor={activeScene?.textColor}
            sceneTitleSize={activeScene?.textSize}
            sceneTitlePosition={activeScene?.textPosition}
            onTextClick={() => setIsTextModalOpen(true)}
            onUpdateTextPosition={(x, y) => {
              updateScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, textPosition: { x, y } } : s));
            }}
            onSelectCharacter={(charId) => setActiveCharacterId(charId)}
            onCharacterClick={(charId) => handleCharacterClick(charId)}
            onUpdateCharacterPosition={(charId, x, y) => {
              setSpriteStates(prev => {
                const current = prev[charId] || INITIAL_SPRITE_STATE;
                return {
                  ...prev,
                  [charId]: {
                    ...current,
                    x,
                    y,
                    homeX: x,
                    homeY: y
                  }
                };
              });
            }}
          />

          {/* Right Sidebar: Scenes */}
          <div className="w-44 bg-[#FBD5A5] rounded-[32px] flex flex-col items-center py-4 gap-3 border-4 border-[#F9C17D] shadow-inner shrink-0 animate-fade-in overflow-hidden h-fit">
            {/* Scrollable list of scenes */}
            <div className={cn(
              "w-full kid-scrollbar flex flex-col items-center gap-3 px-1 pb-4 min-h-0 shrink-0",
              scenes.length > 3 ? "overflow-y-auto h-[320px]" : "overflow-y-hidden h-fit"
            )}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAddScene}
                className="w-14 h-14 bg-[#7CB342] border-4 border-[#558B2F] rounded-2xl flex items-center justify-center shadow-lg text-white shrink-0 mt-1 mb-2 sticky top-1 z-30"
                title="Add Scene"
              >
                <Plus className="w-8 h-8 stroke-[3]" />
              </motion.button>

              {scenes.map((scene, index) => {
                const isActive = scene.id === activeSceneId;
                return (
                  <div key={scene.id} className="w-full px-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveSceneId(scene.id)}
                      className={cn(
                        "w-full h-24 rounded-3xl flex flex-col items-center justify-center relative transition-all duration-200 border-4 overflow-hidden cursor-pointer",
                        isActive 
                          ? "bg-[#D81B60] border-[#AD1457] shadow-lg scale-105 z-10" 
                          : "bg-white/40 border-transparent hover:bg-white/60"
                      )}
                    >
                      <div className="w-full h-full bg-white flex items-center justify-center p-1">
                        <div className="w-full h-full rounded-xl bg-sky-100 flex items-center justify-center relative overflow-hidden">
                          {scene.background && <img src={scene.background} className="absolute inset-0 w-full h-full object-cover" />}
                          <span className={cn(
                            "absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10 border-2 border-white shadow-sm",
                            isActive ? "bg-[#D81B60]" : "bg-gray-400"
                          )}>
                            {index + 1}
                          </span>
                          {isActive && scenes.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScene(scene.id);
                              }}
                              className="absolute top-1 left-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm z-20"
                              title="Delete Scene"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Half: Coding Area */}
        <div className="flex flex-col bg-[#FDF2E3] rounded-[40px] shadow-xl border-4 border-[#F9C17D] overflow-hidden h-[380px] sm:h-[410px] md:h-[440px] shrink-0 min-h-0 relative">
          <Palette 
            onDragStart={handlePaletteDragStart} 
            onRecordClick={() => setIsRecordModalOpen(true)}
            recordings={recordings}
          />
          
          <div className="flex-1 p-2 md:p-3 flex flex-col gap-1.5 min-h-0 relative">
            <div className="flex justify-between items-center px-3 py-1 border-b border-[#F9C17D]/30 mb-1">
              <h2 className="text-[#8D6E63] font-black uppercase tracking-wider text-[12px]">YOUR CODE</h2>
              <button 
                onClick={clearWorkspace}
                className="text-[#8D6E63] hover:text-red-500 transition-colors flex items-center gap-1.5 text-[12px] font-black uppercase"
              >
                <Trash2 className="w-3.5 h-3.5" />
                CLEAR
              </button>
            </div>
            
            <div className="flex-1 relative min-h-0">
              {/* Active Character Watermark/Preview */}
              {(() => {
                const activeChar = characters.find(c => c.id === activeCharacterId);
                if (!activeChar) return null;
                return (
                  <div className="absolute top-4 left-4 w-28 h-28 pointer-events-none z-10 opacity-30">
                    <img 
                      src={activeChar.spriteUrl} 
                      alt="" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
              })()}

              <Workspace 
                workspaceRef={workspaceRef}
                stacks={stacks} 
                activeBlockId={activeBlockId}
                onTimesChange={handleTimesChange}
                onTextChange={handleTextChange}
                onOpenKeypad={handleOpenKeypad}
                onDelete={handleDeleteBlock}
                onDragStart={handleWorkspaceDragStart}
                characters={characters}
              />
            </div>
          </div>
        </div>
      </main>

      <DragOverlayView dragState={dragState} />
      
      <SpriteGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        onSelect={handleSelectSprite} 
        onPaintNew={() => setIsPaintEditorOpen(true)}
      />

      <PaintEditor
        isOpen={isPaintEditorOpen}
        onClose={() => {
          setIsPaintEditorOpen(false);
          setEditingCharacterId(null);
        }}
        initialName={editingCharacterId ? characters.find(c => c.id === editingCharacterId)?.name : undefined}
        initialShapes={editingCharacterId ? characters.find(c => c.id === editingCharacterId)?.shapes : undefined}
        initialSpriteUrl={editingCharacterId ? characters.find(c => c.id === editingCharacterId)?.spriteUrl : undefined}
        onSave={(name, dataUrl, shapes) => {
          if (editingCharacterId) {
            // Edit existing character
            setCharacters(prev => prev.map(c => c.id === editingCharacterId ? { ...c, name, spriteUrl: dataUrl, shapes } : c));
            setEditingCharacterId(null);
          } else {
            // Create new character
            const newCharId = `char-${Date.now()}`;
            setCharacters(prev => [...prev, { id: newCharId, name, spriteUrl: dataUrl, shapes }]);
            setSpriteStates(prev => ({
              ...prev,
              [newCharId]: INITIAL_SPRITE_STATE
            }));
            updateScenes(prev => prev.map(s => {
              if (s.id === activeSceneId) {
                return {
                  ...s,
                  characterStacks: {
                    ...(s.characterStacks || {}),
                    [newCharId]: []
                  }
                };
              }
              return s;
            }));
            setActiveCharacterId(newCharId);
          }
          setIsPaintEditorOpen(false);
        }}
      />

      <BackgroundGallery
        isOpen={isBackgroundGalleryOpen}
        onClose={() => setIsBackgroundGalleryOpen(false)}
        onSelect={handleSelectBackground}
      />

      <KidKeypad
        isOpen={keypadConfig.isOpen}
        mode={keypadConfig.mode}
        title={keypadConfig.title}
        initialValue={keypadConfig.initialValue}
        anchorRect={keypadConfig.anchorRect}
        onClose={() => setKeypadConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={keypadConfig.onConfirm}
        characters={characters}
        activeCharacterId={activeCharacterId}
      />

      <TextEditorModal
        isOpen={isTextModalOpen}
        initialValue={activeScene?.text || ''}
        initialColor={activeScene?.textColor || '#000000'}
        initialSize={activeScene?.textSize || 'medium'}
        onClose={() => setIsTextModalOpen(false)}
        onSave={(newText, newColor, newSize) => {
          updateScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, text: newText, textColor: newColor, textSize: newSize } : s));
          setIsTextModalOpen(false);
        }}
      />

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={(audioUrl) => {
          const nextId = Object.keys(recordings).length + 1;
          setRecordings(prev => ({ ...prev, [nextId]: audioUrl }));
          setIsRecordModalOpen(false);
        }}
      />

      {isPresentationMode && (
        <div className="fixed inset-0 bg-[#F4EFE6] z-[9999] flex flex-col items-center justify-between p-6 select-none overflow-hidden animate-fade-in">
          {/* Top Control Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between bg-white/85 backdrop-blur-md px-6 py-3 rounded-3xl shadow-md border border-[#e5dfd3] z-10 shrink-0">
            {/* Play, Stop, Reset (RTL flow) */}
            <div className="flex items-center gap-4">
              <button 
                onClick={playScene}
                disabled={isRunning || stacks.length === 0}
                className="hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go"
              >
                <img src={getAssetUrl("/UI/go.svg")} alt="Go" className="w-[60px] h-[60px] object-contain" />
              </button>
              
              <button 
                onClick={stopScene}
                disabled={!isRunning}
                className="hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                title="Stop"
              >
                <img src={getAssetUrl("/UI/stop1.svg")} alt="Stop" className="w-[60px] h-[60px] object-contain" />
              </button>

              <button 
                onClick={resetStage}
                className="hover:scale-110 transition-transform"
                title="Reset"
              >
                <img src={getAssetUrl("/UI/resetAll.svg")} alt="Reset" className="w-[60px] h-[60px] object-contain" />
              </button>
            </div>

            {/* Title / Project Name */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-black text-gray-800 tracking-tight">Presentation</h2>
            </div>

            {/* Close / Minimize Mode */}
            <div>
              <button 
                onClick={() => {
                  stopScene();
                  setIsPresentationMode(false);
                }}
                className="hover:scale-110 transition-transform"
                title="Exit Full Screen"
              >
                <svg width="60" height="60" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="36" cy="62" rx="26" ry="6" fill="#333333" fillOpacity="0.2"/>
                  <rect x="6" y="6" width="60" height="52" rx="26" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
                  <rect x="10" y="10" width="52" height="44" rx="22" fill="url(#red_grad)"/>
                  <path d="M14 24C14 18.4772 18.4772 14 24 14H48C53.5228 14 58 18.4772 58 24C58 25 53 20 48 20H24C19 20 14 25 14 24Z" fill="white" fillOpacity="0.45"/>
                  <g stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M25 25L47 47M47 25L25 47" />
                  </g>
                  <defs>
                    <linearGradient id="red_grad" x1="36" y1="10" x2="36" y2="54" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#EF5350"/>
                      <stop offset="100%" stopColor="#E53935"/>
                    </linearGradient>
                  </defs>
                </svg>
              </button>
            </div>
          </div>

          {/* Scaled Stage Container */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 relative">
            <Stage 
              key={activeSceneId}
              characters={characters} 
              activeCharacterId={activeCharacterId} 
              activeSceneId={activeSceneId}
              spriteStates={spriteStates} 
              showGrid={showGrid}
              background={activeScene?.background}
              sceneTitle={activeScene?.text}
              sceneTitleColor={activeScene?.textColor}
              sceneTitleSize={activeScene?.textSize}
              sceneTitlePosition={activeScene?.textPosition}
              disableDragging={true}
              onSelectCharacter={(charId) => setActiveCharacterId(charId)}
              onCharacterClick={(charId) => handleCharacterClick(charId)}
            />
          </div>
          
          {/* Bottom Bar spacer to match top spacing */}
          <div className="h-6 shrink-0" />
        </div>
      )}

      {/* Mobile Warning Overlay */}
      {showMobileWarning && (
        <div className="md:hidden fixed inset-0 bg-white/95 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <Monitor className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">Desktop Recommended</h2>
          <p className="text-xl text-slate-600 mb-8 max-w-sm">
            This version is optimized for desktop computers and some tablets.
          </p>
          <button 
            onClick={() => setShowMobileWarning(false)}
            className="px-8 py-4 bg-indigo-500 text-white rounded-2xl font-bold text-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30 active:scale-95"
          >
            Continue anyway
          </button>
        </div>
      )}
    </div>
  );
}

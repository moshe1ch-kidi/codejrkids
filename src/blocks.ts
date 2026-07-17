export type BlockCategory = 'EVENTS' | 'MOTION' | 'LOOKS' | 'SOUND' | 'CONTROL' | 'END';

export type BlockType = 
  | 'START_FLAG'
  | 'START_TOUCH'
  | 'START_BUMP'
  | 'START_GET_MESSAGE'
  | 'SEND_MESSAGE'
  | 'MOVE_RIGHT'
  | 'MOVE_LEFT'
  | 'MOVE_UP'
  | 'MOVE_DOWN'
  | 'TURN_RIGHT'
  | 'TURN_LEFT'
  | 'HOP'
  | 'GO_HOME'
  | 'SAY'
  | 'GROW'
  | 'SHRINK'
  | 'RESET_SIZE'
  | 'HIDE'
  | 'SHOW'
  | 'POP'
  | 'PLAY_RECORDED'
  | 'WAIT'
  | 'STOP'
  | 'SET_SPEED'
  | 'REPEAT'
  | 'REPEAT_FOREVER'
  | 'END'
  | 'GOTO_PAGE';

export interface BlockDef {
  type: BlockType;
  category: BlockCategory;
  color: string;
  textColor: string;
  icon: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  // EVENTS (Yellow)
  START_FLAG: { type: 'START_FLAG', category: 'EVENTS', color: 'bg-[#ffc600]', textColor: 'text-[#ffc600]', icon: '/icons/greenFlag.svg' },
  START_TOUCH: { type: 'START_TOUCH', category: 'EVENTS', color: 'bg-[#ffc600]', textColor: 'text-[#ffc600]', icon: '/icons/OnTouch.svg' },
  START_BUMP: { type: 'START_BUMP', category: 'EVENTS', color: 'bg-[#ffc600]', textColor: 'text-[#ffc600]', icon: '/icons/Bump.svg' },
  START_GET_MESSAGE: { type: 'START_GET_MESSAGE', category: 'EVENTS', color: 'bg-[#ffc600]', textColor: 'text-[#ffc600]', icon: '/icons/LetterGet_Orange.svg' },
  SEND_MESSAGE: { type: 'SEND_MESSAGE', category: 'EVENTS', color: 'bg-[#ffc600]', textColor: 'text-[#ffc600]', icon: '/icons/LetterSend_Orange.svg' },
  
  // MOTION (Blue)
  MOVE_RIGHT: { type: 'MOVE_RIGHT', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Foward.svg' },
  MOVE_LEFT: { type: 'MOVE_LEFT', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Back.svg' },
  MOVE_UP: { type: 'MOVE_UP', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Up.svg' },
  MOVE_DOWN: { type: 'MOVE_DOWN', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Down.svg' },
  TURN_RIGHT: { type: 'TURN_RIGHT', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Right.svg' },
  TURN_LEFT: { type: 'TURN_LEFT', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Left.svg' },
  HOP: { type: 'HOP', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Hop.svg' },
  GO_HOME: { type: 'GO_HOME', category: 'MOTION', color: 'bg-[#3373cc]', textColor: 'text-[#3373cc]', icon: '/icons/Home.svg' },
  
  // LOOKS (Purple)
  SAY: { type: 'SAY', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Say.svg' },
  GROW: { type: 'GROW', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Grow.svg' },
  SHRINK: { type: 'SHRINK', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Shrink.svg' },
  RESET_SIZE: { type: 'RESET_SIZE', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Reset.svg' },
  HIDE: { type: 'HIDE', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Disappear.svg' },
  SHOW: { type: 'SHOW', category: 'LOOKS', color: 'bg-[#9966ff]', textColor: 'text-[#9966ff]', icon: '/icons/Appear.svg' },

  // SOUND (Green)
  POP: { type: 'POP', category: 'SOUND', color: 'bg-[#4cc14d]', textColor: 'text-[#4cc14d]', icon: '/icons/Speaker.svg' },
  PLAY_RECORDED: { type: 'PLAY_RECORDED', category: 'SOUND', color: 'bg-[#4cc14d]', textColor: 'text-[#4cc14d]', icon: '/icons/Microphone.svg' },

  // CONTROL (Orange)
  WAIT: { type: 'WAIT', category: 'CONTROL', color: 'bg-[#ff9900]', textColor: 'text-[#ff9900]', icon: '/icons/Wait.svg' },
  STOP: { type: 'STOP', category: 'CONTROL', color: 'bg-[#ff9900]', textColor: 'text-[#ff9900]', icon: '/icons/Stop.svg' },
  SET_SPEED: { type: 'SET_SPEED', category: 'CONTROL', color: 'bg-[#ff9900]', textColor: 'text-[#ff9900]', icon: '/icons/speed1.svg' },
  REPEAT: { type: 'REPEAT', category: 'CONTROL', color: 'bg-[#ff9900]', textColor: 'text-[#ff9900]', icon: '/icons/Repeat.svg' },

  // END (Red)
  REPEAT_FOREVER: { type: 'REPEAT_FOREVER', category: 'END', color: 'bg-[#ff4d4d]', textColor: 'text-[#ff4d4d]', icon: '/icons/Forever.svg' },
  END: { type: 'END', category: 'END', color: 'bg-[#ff4d4d]', textColor: 'text-[#ff4d4d]', icon: '' },
  GOTO_PAGE: { type: 'GOTO_PAGE', category: 'END', color: 'bg-[#ff4d4d]', textColor: 'text-[#ff4d4d]', icon: '' },
};

export interface BlockInstance {
  id: string;
  type: BlockType;
  children?: BlockInstance[];
  times?: number;
  text?: string;
}

export interface Stack {
  id: string;
  x: number;
  y: number;
  blocks: BlockInstance[];
}

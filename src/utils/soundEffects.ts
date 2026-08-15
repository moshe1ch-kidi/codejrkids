export interface SoundEffectItem {
  id: string;
  name: string;
  iconName: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const SOUND_EFFECTS: SoundEffectItem[] = [
  {
    id: 'pop',
    name: 'Pop',
    iconName: 'Sparkles',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-700',
    description: 'Classic bubble pop'
  },
  {
    id: 'boing',
    name: 'Boing',
    iconName: 'Activity',
    bgColor: 'bg-amber-100 hover:bg-amber-200',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-700',
    description: 'Bouncy spring effect'
  },
  {
    id: 'laser',
    name: 'Laser',
    iconName: 'Zap',
    bgColor: 'bg-cyan-100 hover:bg-cyan-200',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-700',
    description: 'Sci-fi blaster shot'
  },
  {
    id: 'ding',
    name: 'Ding',
    iconName: 'Bell',
    bgColor: 'bg-yellow-100 hover:bg-yellow-200',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-700',
    description: 'Clear crystal bell'
  },
  {
    id: 'magic',
    name: 'Magic',
    iconName: 'Wand2',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-700',
    description: 'Sparkling magic chime'
  },
  {
    id: 'jump',
    name: 'Jump',
    iconName: 'ChevronsUp',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700',
    description: 'Retro game jump'
  },
  {
    id: 'buzzer',
    name: 'Buzzer',
    iconName: 'Megaphone',
    bgColor: 'bg-rose-100 hover:bg-rose-200',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-700',
    description: 'Electronic buzz alarm'
  },
  {
    id: 'drum',
    name: 'Drum',
    iconName: 'Disc',
    bgColor: 'bg-orange-100 hover:bg-orange-200',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-700',
    description: 'Snappy percussion beat'
  },
  {
    id: 'meow',
    name: 'Meow',
    iconName: 'Smile',
    bgColor: 'bg-pink-100 hover:bg-pink-200',
    borderColor: 'border-pink-400',
    textColor: 'text-pink-700',
    description: 'Cute kitty meow'
  },
  {
    id: 'zap',
    name: 'Zap',
    iconName: 'Flame',
    bgColor: 'bg-violet-100 hover:bg-violet-200',
    borderColor: 'border-violet-400',
    textColor: 'text-violet-700',
    description: 'Electric spark zap'
  }
];

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playSoundEffect(effectId: string) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (effectId) {
      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(1050, now + 0.12);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'boing': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(520, now + 0.08);
        osc.frequency.linearRampToValueAtTime(320, now + 0.16);
        osc.frequency.linearRampToValueAtTime(480, now + 0.24);
        osc.frequency.linearRampToValueAtTime(380, now + 0.32);
        osc.frequency.linearRampToValueAtTime(420, now + 0.4);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'laser': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case 'ding': {
        [1046.5, 2093].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          const vol = idx === 0 ? 0.5 : 0.2;
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.7);
        });
        break;
      }

      case 'magic': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.06;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.35, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
        break;
      }

      case 'jump': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'buzzer': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.setValueAtTime(0.35, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      case 'drum': {
        // Low pitch kick thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);

        // Snare noise snap
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.1);
        break;
      }

      case 'meow': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(850, now + 0.15);
        osc.frequency.linearRampToValueAtTime(580, now + 0.38);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case 'zap': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.05);
        osc.frequency.linearRampToValueAtTime(900, now + 0.1);
        osc.frequency.linearRampToValueAtTime(150, now + 0.16);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      default:
        // Default to pop
        playSoundEffect('pop');
        break;
    }
  } catch (err) {
    console.error('Audio playback error:', err);
  }
}

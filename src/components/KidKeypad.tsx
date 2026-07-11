import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Check, Rocket } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

export type KeypadMode = 'number' | 'text' | 'speed' | 'character' | 'message_color';

interface KidKeypadProps {
  isOpen: boolean;
  mode: KeypadMode;
  title: string;
  initialValue: string;
  anchorRect?: DOMRect;
  onClose: () => void;
  onConfirm: (value: string) => void;
  characters?: { id: string; name: string; spriteUrl: string }[];
  activeCharacterId?: string;
}

const PRESET_PHRASES = [
  'שלום!',
  'בוקר טוב!',
  'איזה כיף!',
  'יש!',
  'להתראות!',
  'קדימה!'
];

export function KidKeypad({ isOpen, mode, initialValue, anchorRect, onClose, onConfirm, characters, activeCharacterId }: KidKeypadProps) {
  const [value, setValue] = useState(initialValue);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 0, placement: 'bottom', isReady: false });

  // Sync state value when opened
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue, mode]);

  // Handle live window positioning
  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        // Set fixed mini-dimensions depending on the active input mode
        const keypadWidth = mode === 'number' ? 150 : mode === 'speed' ? 196 : mode === 'character' ? 220 : mode === 'message_color' ? 280 : 210;
        const keypadHeight = mode === 'number' ? 220 : mode === 'speed' ? 76 : mode === 'character' ? 200 : mode === 'message_color' ? 200 : 240;

        if (anchorRect) {
          // Center the popover with the clicked bubble
          let left = anchorRect.left + anchorRect.width / 2 - keypadWidth / 2;
          // Constrain within screen safe borders
          left = Math.max(8, Math.min(left, window.innerWidth - keypadWidth - 8));

          // Default position: floating below the block
          let top = anchorRect.bottom + 10 + window.scrollY;
          let placement = 'bottom';

          // Fallback to top position if bottom overflows viewport
          if (anchorRect.bottom + keypadHeight + 30 > window.innerHeight) {
            top = anchorRect.top - keypadHeight - 10 + window.scrollY;
            placement = 'top';
          }

          const arrowLeft = anchorRect.left + anchorRect.width / 2 - left;
          setCoords({ top, left, arrowLeft, placement, isReady: true });
        } else {
          // Centered modal fallback
          const top = window.innerHeight / 2 - keypadHeight / 2 + window.scrollY;
          const left = window.innerWidth / 2 - keypadWidth / 2;
          setCoords({ top, left, arrowLeft: keypadWidth / 2, placement: 'center', isReady: true });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    } else {
      setCoords(prev => ({ ...prev, isReady: false }));
    }
  }, [isOpen, anchorRect, mode]);

  if (!isOpen) return null;

  const handleNumberClick = (num: string) => {
    if (value === '0') {
      setValue(num);
    } else {
      if (value.length < 3) {
        setValue(prev => prev + num);
      }
    }
  };

  const handleDelete = () => {
    if (value.length <= 1) {
      setValue('0');
    } else {
      setValue(prev => prev.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    if (mode === 'number') {
      const parsed = parseInt(value);
      if (isNaN(parsed) || parsed < 1) {
        onConfirm('1');
      } else {
        onConfirm(String(parsed));
      }
    } else {
      onConfirm(value || (mode === 'speed' ? '2' : 'שלום!'));
    }
    onClose();
  };

  const keyColors = [
    'bg-pink-400 hover:bg-pink-500 text-white border-pink-500/20 shadow-sm',
    'bg-purple-400 hover:bg-purple-500 text-white border-purple-500/20 shadow-sm',
    'bg-sky-400 hover:bg-sky-500 text-white border-sky-500/20 shadow-sm',
    'bg-emerald-400 hover:bg-emerald-500 text-white border-emerald-500/20 shadow-sm',
    'bg-amber-400 hover:bg-amber-500 text-white border-amber-500/20 shadow-sm',
    'bg-indigo-400 hover:bg-indigo-500 text-white border-indigo-500/20 shadow-sm',
    'bg-teal-400 hover:bg-teal-500 text-white border-teal-500/20 shadow-sm',
    'bg-rose-400 hover:bg-rose-500 text-white border-rose-500/20 shadow-sm',
    'bg-orange-400 hover:bg-orange-500 text-white border-orange-500/20 shadow-sm',
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none" dir="rtl">
        {/* Transparent Backdrop that handles click dismiss */}
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[0.5px] pointer-events-auto"
        />

        {/* Floating Mini Keypad Panel */}
        {coords.isReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: coords.placement === 'bottom' ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: coords.placement === 'bottom' ? -6 : 6 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ 
              position: 'absolute', 
              top: coords.top, 
              left: coords.left,
              width: mode === 'number' ? 150 : mode === 'speed' ? 196 : mode === 'character' ? 'auto' : mode === 'message_color' ? 280 : 210
            }}
            className={`pointer-events-auto shadow-2xl z-50 overflow-hidden select-none ${
              mode === 'speed'
                ? "bg-[#ff9900] border-2 border-[#e68a00] p-2 rounded-2xl flex gap-1.5"
                : mode === 'character' || mode === 'message_color'
                  ? "bg-[#eef2f6] rounded-[24px] border-[4px] border-[#ffc600] p-3 flex flex-col gap-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15),0_8px_16px_-6px_rgba(0,0,0,0.15)]"
                  : "bg-white rounded-2xl border-2 border-slate-200/90 p-2.5 flex flex-col gap-2"
            }`}
          >
            {/* Triangular bubble arrow pointing at the center of the bubble */}
            {coords.placement === 'bottom' && (
              <div 
                className={`absolute -top-2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[8px] ${
                  mode === 'speed' 
                    ? 'border-b-[#e68a00]' 
                    : (mode === 'character' || mode === 'message_color')
                      ? 'border-b-[#ffc600]'
                      : 'border-b-slate-200'
                }`} 
                style={{ left: coords.arrowLeft - 7 }}
              >
                <div className={`absolute top-[1.5px] -left-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[7px] ${
                  mode === 'speed' 
                    ? 'border-b-[#ff9900]' 
                    : (mode === 'character' || mode === 'message_color')
                      ? 'border-b-[#eef2f6]'
                      : 'border-b-white'
                }`} />
              </div>
            )}
            {coords.placement === 'top' && (
              <div 
                className={`absolute -bottom-2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] ${
                  mode === 'speed' 
                    ? 'border-t-[#e68a00]' 
                    : (mode === 'character' || mode === 'message_color')
                      ? 'border-t-[#ffc600]'
                      : 'border-t-slate-200'
                }`} 
                style={{ left: coords.arrowLeft - 7 }}
              >
                <div className={`absolute bottom-[1.5px] -left-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] ${
                  mode === 'speed' 
                    ? 'border-t-[#ff9900]' 
                    : (mode === 'character' || mode === 'message_color')
                      ? 'border-t-[#eef2f6]'
                      : 'border-t-white'
                }`} />
              </div>
            )}

            {mode === 'character' ? (
              <div className="flex flex-col gap-1 w-full min-w-[200px]">
                {/* Scrollable list of cards - horizontal scrolling tray */}
                <div className="flex flex-wrap gap-2.5 p-1 max-w-[280px] justify-center">
                  {/* Any Character Option */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setValue('any');
                      onConfirm('any');
                      onClose();
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-[16px] border-2 transition-all text-center w-20 h-20 shrink-0 ${
                      value === 'any'
                        ? 'bg-white border-[#ff9900] shadow-md ring-2 ring-[#ff9900]/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-sm'
                    }`}
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-1 text-orange-500">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-black text-slate-700 truncate w-full">
                      כל דמות
                    </div>
                  </motion.button>

                  {/* Individual Characters */}
                  {characters?.filter(c => c.id !== activeCharacterId).map((char) => (
                    <motion.button
                      key={char.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setValue(char.id);
                        onConfirm(char.id);
                        onClose();
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-[16px] border-2 transition-all text-center w-20 h-20 shrink-0 ${
                        value === char.id
                          ? 'bg-white border-[#ff9900] shadow-md ring-2 ring-[#ff9900]/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 p-0.5 flex items-center justify-center mb-1 overflow-hidden shrink-0">
                        {char.spriteUrl ? (
                          <img src={char.spriteUrl} alt={char.name} className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                        ) : (
                          <Rocket className="w-6 h-6 text-sky-500" />
                        )}
                      </div>
                      <div className="text-[10px] font-black text-slate-700 truncate w-full">
                        {char.name}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : mode === 'message_color' ? (
              <div className="flex flex-col gap-1 w-full min-w-[200px]">
                <div className="flex flex-wrap gap-2.5 p-1 max-w-[280px] justify-center">
                  {[
                    { val: 'orange', label: 'כתום', bg: 'bg-[#ff9900]/10 hover:bg-[#ff9900]/20 border-orange-200' },
                    { val: 'red', label: 'אדום', bg: 'bg-red-50 hover:bg-red-100 border-red-200' },
                    { val: 'yellow', label: 'צהוב', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' },
                    { val: 'green', label: 'ירוק', bg: 'bg-green-50 hover:bg-green-100 border-green-200' },
                    { val: 'blue', label: 'כחול', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
                    { val: 'purple', label: 'סגול', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
                  ].map((item) => {
                    const isSelected = value === item.val;
                    const cap = item.val.charAt(0).toUpperCase() + item.val.slice(1);
                    return (
                      <motion.button
                        key={item.val}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setValue(item.val);
                          onConfirm(item.val);
                          onClose();
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-[16px] border-2 transition-all text-center w-20 h-20 shrink-0 ${
                          isSelected
                            ? 'bg-white border-[#ffc600] shadow-md ring-2 ring-[#ffc600]/20 scale-105'
                            : `bg-white ${item.bg} shadow-sm`
                        }`}
                      >
                        <div className="w-10 h-10 p-0.5 flex items-center justify-center mb-1 overflow-hidden shrink-0">
                          <img 
                            src={getAssetUrl(`/icons/LetterGet_${cap}.svg`)} 
                            alt={item.label} 
                            className="max-w-full max-h-full object-contain pointer-events-none select-none" 
                          />
                        </div>
                        <div className="text-[10px] font-black text-slate-700 truncate w-full">
                          {item.label}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : mode === 'speed' ? (
              <div className="flex gap-1.5 w-full justify-between items-center">
                {[
                  { val: '1', icon: getAssetUrl('/icons/speed0.svg'), label: 'איטי' },
                  { val: '2', icon: getAssetUrl('/icons/speed1.svg'), label: 'רגיל' },
                  { val: '3', icon: getAssetUrl('/icons/speed2.svg'), label: 'מהיר' }
                ].map((speed) => {
                  const isSelected = value === speed.val;
                  return (
                    <motion.button
                      key={speed.val}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setValue(speed.val);
                        onConfirm(speed.val);
                        onClose();
                      }}
                      className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#ffb330] border-2 border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] scale-105' 
                          : 'bg-[#e68a00]/40 hover:bg-[#e68a00]/60 border-2 border-transparent'
                      }`}
                      title={speed.label}
                    >
                      <img src={speed.icon} alt={speed.label} className="w-11 h-11 pointer-events-none select-none filter drop-shadow-sm" />
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Compact Display input screen */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center justify-center min-h-[40px] relative shadow-inner">
                  {mode === 'number' && (
                    <span className="text-2xl font-extrabold text-slate-700 tracking-wider">
                      {value}
                    </span>
                  )}
                  {mode === 'text' && (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full text-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-orange-400 transition-colors"
                      placeholder="הקלד הודעה..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                      }}
                    />
                  )}
                </div>

                {/* Custom Grid / Elements for Keypads */}
                {mode === 'number' && (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, i) => (
                        <motion.button
                          key={num}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleNumberClick(String(num))}
                          className={`h-9 rounded-lg font-extrabold text-lg flex items-center justify-center border-b-2 active:border-b-0 ${keyColors[i]}`}
                        >
                          {num}
                        </motion.button>
                      ))}

                      {/* Delete / Backspace */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDelete}
                        className="h-9 rounded-lg bg-rose-400 hover:bg-rose-500 text-white border-b-2 border-rose-500/20 flex items-center justify-center active:border-b-0"
                      >
                        <Delete className="w-5 h-5" />
                      </motion.button>

                      {/* Zero key */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleNumberClick('0')}
                        className="h-9 rounded-lg bg-amber-400 hover:bg-amber-500 text-white border-b-2 border-amber-500/20 flex items-center justify-center active:border-b-0 font-extrabold text-lg"
                      >
                        0
                      </motion.button>

                      {/* Confirm / Check key */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirm}
                        className="h-9 rounded-lg bg-emerald-400 hover:bg-emerald-500 text-white border-b-2 border-emerald-500/20 flex items-center justify-center active:border-b-0"
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {mode === 'text' && (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1 max-h-[105px] overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
                      {PRESET_PHRASES.map((phrase) => (
                        <motion.button
                          key={phrase}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setValue(phrase)}
                          className="py-1 px-1.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-md font-bold text-[11px] text-slate-700 shadow-xs transition-colors text-center truncate"
                        >
                          {phrase}
                        </motion.button>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleConfirm}
                        className="flex-1 py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        אישור
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={onClose}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg flex items-center justify-center"
                      >
                        ביטול
                      </motion.button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}

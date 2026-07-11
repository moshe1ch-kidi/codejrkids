import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface TextEditorModalProps {
  isOpen: boolean;
  initialValue: string;
  initialColor?: string;
  initialSize?: FontSize;
  onClose: () => void;
  onSave: (text: string, color: string, size: FontSize) => void;
}

const COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#ff4d4d', // Red
  '#ff9933', // Orange
  '#ffcc00', // Yellow
  '#33cc33', // Green
  '#3399ff', // Blue
  '#cc33ff', // Purple
];

export function TextEditorModal({ isOpen, initialValue, initialColor = '#ffffff', initialSize = 'medium', onClose, onSave }: TextEditorModalProps) {
  const [text, setText] = useState(initialValue);
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState<FontSize>(initialSize);

  useEffect(() => {
    if (isOpen) {
      setText(initialValue);
      setColor(initialColor);
      setSize(initialSize);
    }
  }, [isOpen, initialValue, initialColor, initialSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div 
        className="relative bg-[#4a89b4] rounded-2xl w-[600px] h-[360px] shadow-2xl p-6 flex flex-col border-[6px] border-[#37698e]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl font-black text-[#4a89b4] border-4 border-[#37698e] shadow-lg hover:scale-110 transition-transform"
        >
          X
        </button>

        <div className="flex-1 mt-8">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSave(text, color, size);
              }
            }}
            className={cn(
              "w-full bg-white rounded-xl h-24 font-black text-center px-4 outline-none border-4 border-[#37698e] shadow-inner",
              size === 'small' ? 'text-3xl' : size === 'medium' ? 'text-5xl' : size === 'large' ? 'text-7xl' : 'text-8xl'
            )}
            style={{ color }}
            autoFocus
          />
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-10 h-10 rounded-full border-4 shadow-sm transition-transform hover:scale-110",
                color === c ? "border-yellow-400 scale-110" : "border-white"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex justify-between items-end mb-4">
          <div className="flex gap-2">
             {/* AAA Icon */}
             <div className="flex items-end select-none gap-2 px-2 pb-1">
                <button 
                  onClick={() => setSize('small')}
                  className={cn(
                    "text-white font-black text-2xl drop-shadow-md hover:scale-110 transition-transform origin-bottom",
                    size === 'small' && "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  )}
                >
                  A
                </button>
                <button 
                  onClick={() => setSize('medium')}
                  className={cn(
                    "text-white font-black text-4xl drop-shadow-md hover:scale-110 transition-transform origin-bottom",
                    size === 'medium' && "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  )}
                >
                  A
                </button>
                <button 
                  onClick={() => setSize('large')}
                  className={cn(
                    "text-white font-black text-5xl drop-shadow-md hover:scale-110 transition-transform origin-bottom",
                    size === 'large' && "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  )}
                >
                  A
                </button>
                <button 
                  onClick={() => setSize('xlarge')}
                  className={cn(
                    "text-white font-black text-6xl drop-shadow-md hover:scale-110 transition-transform origin-bottom",
                    size === 'xlarge' && "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  )}
                >
                  A
                </button>
             </div>
          </div>
          <button
            onClick={() => onSave(text, color, size)}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-[#37698e] shadow-lg hover:scale-105 transition-transform"
          >
            <span className="text-3xl text-[#4a89b4] font-black">✓</span>
          </button>
        </div>
      </div>
    </div>
  );
}

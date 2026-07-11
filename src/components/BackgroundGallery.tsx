import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Image as ImageIcon } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

interface BackgroundGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (bg: { name: string; url: string }) => void;
}

const ALL_BACKGROUNDS = [
  { id: 'BeachDay', name: 'BeachDay', file: 'BeachDay.svg', hebName: 'חוף ים (יום)' },
  { id: 'BeachNight', name: 'BeachNight', file: 'BeachNight.svg', hebName: 'חוף ים (לילה)' },
  { id: 'BeachSunrise', name: 'BeachSunrise', file: 'BeachSunrise.svg', hebName: 'חוף ים (זריחה)' },
  { id: 'Bedroom', name: 'Bedroom', file: 'Bedroom.svg', hebName: 'חדר שינה' },
  { id: 'City', name: 'City', file: 'City.svg', hebName: 'עיר' },
  { id: 'Classroom', name: 'Classroom', file: 'Classroom.svg', hebName: 'כיתה' },
  { id: 'Desert', name: 'Desert', file: 'Desert.svg', hebName: 'מדבר' },
  { id: 'Jungle', name: 'Jungle', file: 'Jungle.svg', hebName: 'ג׳ונגל' },
  { id: 'Park', name: 'Park', file: 'Park.svg', hebName: 'פארק' },
  { id: 'Savannah', name: 'Savannah', file: 'Savannah.svg', hebName: 'סוואנה' },
  { id: 'Summer', name: 'Summer', file: 'Summer.svg', hebName: 'קיץ' },
  { id: 'Underwater', name: 'Underwater', file: 'Underwater.svg', hebName: 'מתחת למים' },
  { id: 'Winter', name: 'Winter', file: 'Winter.svg', hebName: 'חורף' },
  { id: 'Woods', name: 'Woods', file: 'Woods.svg', hebName: 'יער' },
];

export function BackgroundGallery({ isOpen, onClose, onSelect }: BackgroundGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBackgrounds = ALL_BACKGROUNDS.filter(bg => {
    return (
      bg.hebName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bg.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 z-10"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-sky-500" />
                בחר רקע חדש
              </h2>
              <p className="text-slate-500 text-sm mt-1">בחר רקע מתוך גלריית הרקעים שהעלית עבור הסצנה הנוכחית!</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white hover:bg-slate-100 transition-colors shadow-sm text-slate-500 hover:text-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="חפש רקע... (לדוגמה: חוף, יער, כיתה)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-sky-400 focus:outline-none transition-colors text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Backgrounds Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {filteredBackgrounds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* Default plain background option */}
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect({ name: 'ריק', url: '' })}
                  className="cursor-pointer bg-white border-2 border-slate-100 hover:border-sky-300 rounded-3xl p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all h-52 relative group overflow-hidden"
                >
                  <div className="flex-1 bg-sky-100 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-100">
                    <div className="absolute top-[10%] left-[10%] w-[15%] h-[8%] bg-white rounded-full opacity-60 blur-sm"></div>
                    <div className="absolute top-[25%] right-[15%] w-[20%] h-[10%] bg-white rounded-full opacity-60 blur-sm"></div>
                    <span className="text-sky-600 font-bold text-xs bg-white/85 px-2 py-1 rounded-full shadow-sm z-10">רקע ברירת מחדל</span>
                  </div>
                  <span className="text-slate-700 font-bold text-sm tracking-tight text-center">
                    ללא רקע (רגיל)
                  </span>
                </motion.div>

                {filteredBackgrounds.map((bg) => {
                  const bgUrl = getAssetUrl(`/background/${bg.file}`);
                  return (
                    <motion.div
                      key={bg.id}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelect({ name: bg.hebName, url: bgUrl })}
                      className="cursor-pointer bg-white border-2 border-slate-100 hover:border-sky-300 rounded-3xl p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all h-52 relative group overflow-hidden"
                    >
                      <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                        <img
                          src={bgUrl}
                          alt={bg.hebName}
                          className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <span className="text-slate-700 font-bold text-sm tracking-tight text-center">
                        {bg.hebName}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                <Search className="w-16 h-16 opacity-40" />
                <span className="text-lg font-medium">לא נמצאו רקעים תואמים לחיפוש שלך</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

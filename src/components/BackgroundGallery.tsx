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
  { id: 'Playroom', name: 'Playroom', file: '01_cheder_mischakim_640x480.svg', displayName: 'חדר משחקים' },
  { id: 'Beach', name: 'Beach', file: '02_chof_yam_640x480.svg', displayName: 'חוף ים' },
  { id: 'Space', name: 'Space', file: '03_chalal_640x480.svg', displayName: 'חלל' },
  { id: 'UrbanStreet', name: 'UrbanStreet', file: '04_rechov_ironi_640x480.svg', displayName: 'רחוב עירוני' },
  { id: 'MagicForest', name: 'MagicForest', file: '05_yaar_kasum_640x480.svg', displayName: 'יער קסום' },
  { id: 'CandyKingdom', name: 'CandyKingdom', file: '06_mamlechet_mamtakim_640x480.svg', displayName: 'ממלכת ממתקים' },
  { id: 'ScienceLab', name: 'ScienceLab', file: '07_maabada_madait_640x480.svg', displayName: 'מעבדה מדעית' },
  { id: 'AncientCastle', name: 'AncientCastle', file: '08_tira_atika_640x480.svg', displayName: 'טירה עתיקה' },
  { id: 'OceanFloor', name: 'OceanFloor', file: '09_karkait_hayam_640x480.svg', displayName: 'קרקעית הים' },
  { id: 'Volcano', name: 'Volcano', file: '10_har_gaash_640x480.svg', displayName: 'הר געש' },
  { id: 'BeachDay', name: 'BeachDay', file: 'BeachDay.svg', displayName: 'Beach (Day)' },
  { id: 'BeachNight', name: 'BeachNight', file: 'BeachNight.svg', displayName: 'Beach (Night)' },
  { id: 'BeachSunrise', name: 'BeachSunrise', file: 'BeachSunrise.svg', displayName: 'Beach (Sunrise)' },
  { id: 'Bedroom', name: 'Bedroom', file: 'Bedroom.svg', displayName: 'Bedroom' },
  { id: 'City', name: 'City', file: 'City.svg', displayName: 'City' },
  { id: 'Classroom', name: 'Classroom', file: 'Classroom.svg', displayName: 'Classroom' },
  { id: 'Desert', name: 'Desert', file: 'Desert.svg', displayName: 'Desert' },
  { id: 'Jungle', name: 'Jungle', file: 'Jungle.svg', displayName: 'Jungle' },
  { id: 'Park', name: 'Park', file: 'Park.svg', displayName: 'Park' },
  { id: 'Savannah', name: 'Savannah', file: 'Savannah.svg', displayName: 'Savannah' },
  { id: 'Summer', name: 'Summer', file: 'Summer.svg', displayName: 'Summer' },
  { id: 'Underwater', name: 'Underwater', file: 'Underwater.svg', displayName: 'Underwater' },
  { id: 'Winter', name: 'Winter', file: 'Winter.svg', displayName: 'Winter' },
  { id: 'Woods', name: 'Woods', file: 'Woods.svg', displayName: 'Woods' },
];

export function BackgroundGallery({ isOpen, onClose, onSelect }: BackgroundGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBackgrounds = ALL_BACKGROUNDS.filter(bg => {
    return (
      bg.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-sky-500" />
                Choose Background
              </h2>
              <p className="text-slate-500 text-sm mt-1">Choose a background for your current scene!</p>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search background... (e.g., beach, forest, classroom)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-sky-400 focus:outline-none transition-colors text-slate-700 font-medium"
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
                  onClick={() => onSelect({ name: 'None', url: '' })}
                  className="cursor-pointer bg-white border-2 border-slate-100 hover:border-sky-300 rounded-3xl p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all h-52 relative group overflow-hidden"
                >
                  <div className="flex-1 bg-sky-100 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-100">
                    <div className="absolute top-[10%] left-[10%] w-[15%] h-[8%] bg-white rounded-full opacity-60 blur-sm"></div>
                    <div className="absolute top-[25%] right-[15%] w-[20%] h-[10%] bg-white rounded-full opacity-60 blur-sm"></div>
                    <span className="text-sky-600 font-bold text-xs bg-white/85 px-2 py-1 rounded-full shadow-sm z-10">Default Background</span>
                  </div>
                  <span className="text-slate-700 font-bold text-sm tracking-tight text-center">
                    Plain Background (None)
                  </span>
                </motion.div>

                {filteredBackgrounds.map((bg) => {
                  const bgUrl = getAssetUrl(`/background/${bg.file}`);
                  return (
                    <motion.div
                      key={bg.id}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelect({ name: bg.displayName, url: bgUrl })}
                      className="cursor-pointer bg-white border-2 border-slate-100 hover:border-sky-300 rounded-3xl p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all h-52 relative group overflow-hidden"
                    >
                      <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                        <img
                          src={bgUrl}
                          alt={bg.displayName}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <span className="text-slate-700 font-bold text-sm tracking-tight text-center">
                        {bg.displayName}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                <Search className="w-16 h-16 opacity-40" />
                <span className="text-lg font-medium">No matching backgrounds found</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

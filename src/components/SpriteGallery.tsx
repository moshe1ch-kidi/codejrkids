import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Brush, Upload } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';

interface SpriteGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sprite: { name: string; url: string }) => void;
  onPaintNew: () => void;
}

const ALL_SPRITES = [
  { id: 'cat1', name: 'Kitten', file: 'cat1.svg' },
  { id: 'Cat', name: 'Cat', file: 'Cat.svg' },
  { id: 'Aeroplane', name: 'Aeroplane', file: 'Aeroplane.svg' },
  { id: 'Apple', name: 'Apple', file: 'Apple.svg' },
  { id: 'Astronaut', name: 'Astronaut', file: 'Astronaut.svg' },
  { id: 'Baby', name: 'Baby', file: 'Baby.svg' },
  { id: 'Ball', name: 'Ball', file: 'Ball.svg' },
  { id: 'Basketball', name: 'Basketball', file: 'Basketball.svg' },
  { id: 'Bat', name: 'Bat', file: 'Bat.svg' },
  { id: 'Bed', name: 'Bed', file: 'Bed.svg' },
  { id: 'Bike', name: 'Bike 1', file: 'Bike.svg' },
  { id: 'Bike2', name: 'Bike 2', file: 'Bike2.svg' },
  { id: 'Bird', name: 'Bird', file: 'Bird.svg' },
  { id: 'Blue', name: 'Blue Character', file: 'Blue.svg' },
  { id: 'Boat2', name: 'Boat', file: 'Boat2.svg' },
  { id: 'Boy', name: 'Boy', file: 'Boy.svg' },
  { id: 'Boy1', name: 'Boy 1', file: 'Boy1.svg' },
  { id: 'Boy2', name: 'Boy 2', file: 'Boy2.svg' },
  { id: 'Boy3', name: 'Boy 3', file: 'Boy3.svg' },
  { id: 'Bus', name: 'Bus', file: 'Bus.svg' },
  { id: 'Butterfly', name: 'Butterfly', file: 'Butterfly.svg' },
  { id: 'Cake', name: 'Cake', file: 'Cake.svg' },
  { id: 'Camel', name: 'Camel', file: 'Camel.svg' },
  { id: 'Car', name: 'Car', file: 'Car.svg' },
  { id: 'Car1', name: 'Car 1', file: 'Car1.svg' },
  { id: 'Car2', name: 'Car 2', file: 'Car2.svg' },
  { id: 'Chicken', name: 'Chicken', file: 'Chicken.svg' },
  { id: 'Child1', name: 'Boy 4', file: 'Child1.svg' },
  { id: 'Cloud1', name: 'Cloud', file: 'Cloud1.svg' },
  { id: 'Crab', name: 'Crab', file: 'Crab.svg' },
  { id: 'Creek', name: 'Creek', file: 'Creek.svg' },
  { id: 'Dog', name: 'Dog', file: 'Dog.svg' },
  { id: 'Dragon', name: 'Dragon', file: 'Dragon.svg' },
  { id: 'Duck', name: 'Duck', file: 'Duck.svg' },
  { id: 'Elephant', name: 'Elephant', file: 'Elephant.svg' },
  { id: 'pandamain', name: 'Panda', file: 'pandamain.svg' }
];

export function SpriteGallery({ isOpen, onClose, onSelect, onPaintNew }: SpriteGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSprites = ALL_SPRITES.filter(sprite => {
    return sprite.name.toLowerCase().includes(searchQuery.toLowerCase());
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
          <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800">Choose a new character</h2>
              <p className="text-slate-500 text-sm mt-1">Choose a character from the gallery, upload your own, or paint one!</p>
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
                placeholder="Search character... (e.g., Cat, Balloon, Car)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-orange-400 focus:outline-none transition-colors text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Sprites Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {/* Upload character card */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const url = event.target?.result as string;
                        onSelect({ name: file.name.split('.')[0], url });
                        onClose();
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-dashed border-indigo-300 hover:border-indigo-400 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all h-36 relative group"
                >
                  <div className="w-20 h-20 flex items-center justify-center bg-white rounded-2xl group-hover:bg-indigo-100/40 transition-colors shadow-inner">
                    <div className="w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center shadow-md">
                      <Upload className="w-6 h-6 text-white stroke-[2.5]" />
                    </div>
                  </div>
                  <span className="text-indigo-700 font-extrabold text-sm tracking-tight truncate max-w-full">
                    Upload Character
                  </span>
                </motion.div>
              </label>

              {/* Create new character card */}
              <motion.div
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onClose();
                  onPaintNew();
                }}
                className="cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 hover:border-orange-400 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all h-36 relative group"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-50/0 to-orange-50/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
                <div className="w-20 h-20 flex items-center justify-center bg-white rounded-2xl group-hover:bg-orange-100/40 transition-colors shadow-inner">
                  <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center shadow-md">
                    <Brush className="w-6 h-6 text-white stroke-[2.5]" />
                  </div>
                </div>
                <span className="text-orange-700 font-extrabold text-sm tracking-tight truncate max-w-full">
                  Create new character
                </span>
              </motion.div>

              {filteredSprites.map((sprite) => {
                const spriteUrl = getAssetUrl(`/sprites/${sprite.file}`);
                return (
                  <motion.div
                    key={sprite.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect({ name: sprite.name, url: spriteUrl })}
                    className="cursor-pointer bg-white border-2 border-slate-100 hover:border-orange-300 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all h-36 relative group"
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-50/0 to-orange-50/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
                    <div className="w-20 h-20 flex items-center justify-center p-1 bg-slate-50 rounded-2xl group-hover:bg-orange-50/50 transition-colors">
                      <img
                        src={spriteUrl}
                        alt={sprite.name}
                        className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
                      />
                    </div>
                    <span className="text-slate-700 font-bold text-sm tracking-tight truncate max-w-full">
                      {sprite.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {filteredSprites.length === 0 && searchQuery !== '' && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 mt-4">
                <Search className="w-10 h-10 opacity-30" />
                <span className="text-sm font-medium">No characters found matching your search</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

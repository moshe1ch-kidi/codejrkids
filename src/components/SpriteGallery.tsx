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

interface SpriteItem {
  id: string;
  name: string;
  file: string;
  category: string | string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'animals', label: 'Animals' },
  { id: 'people', label: 'People' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'food', label: 'Food' },
  { id: 'things', label: 'Things' },
  { id: 'transportation', label: 'Transportation' },
];

const ALL_SPRITES: SpriteItem[] = [
  { id: 'cat1', name: 'Kitten', file: 'cat1.svg', category: 'animals' },
  { id: 'Cat', name: 'Cat', file: 'Cat.svg', category: 'animals' },
  { id: 'Aeroplane', name: 'Aeroplane', file: 'Aeroplane.svg', category: 'transportation' },
  { id: 'Apple', name: 'Apple', file: 'Apple.svg', category: 'food' },
  { id: 'Astronaut', name: 'Astronaut', file: 'Astronaut.svg', category: ['people', 'fantasy'] },
  { id: 'Baby', name: 'Baby', file: 'Baby.svg', category: 'people' },
  { id: 'Ball', name: 'Ball', file: 'Ball.svg', category: 'things' },
  { id: 'Basketball', name: 'Basketball', file: 'Basketball.svg', category: 'things' },
  { id: 'Bat', name: 'Bat', file: 'Bat.svg', category: 'animals' },
  { id: 'Bed', name: 'Bed', file: 'Bed.svg', category: 'things' },
  { id: 'Bike', name: 'Bike 1', file: 'Bike.svg', category: 'transportation' },
  { id: 'Bike2', name: 'Bike 2', file: 'Bike2.svg', category: 'transportation' },
  { id: 'Bird', name: 'Bird', file: 'Bird.svg', category: 'animals' },
  { id: 'Blue', name: 'Blue Character', file: 'Blue.svg', category: ['people', 'fantasy'] },
  { id: 'Boat2', name: 'Boat', file: 'Boat2.svg', category: 'transportation' },
  { id: 'Boy', name: 'Boy', file: 'Boy.svg', category: 'people' },
  { id: 'Boy1', name: 'Boy 1', file: 'Boy1.svg', category: 'people' },
  { id: 'Boy2', name: 'Boy 2', file: 'Boy2.svg', category: 'people' },
  { id: 'Boy3', name: 'Boy 3', file: 'Boy3.svg', category: 'people' },
  { id: 'Bus', name: 'Bus', file: 'Bus.svg', category: 'transportation' },
  { id: 'Butterfly', name: 'Butterfly', file: 'Butterfly.svg', category: 'animals' },
  { id: 'Cake', name: 'Cake', file: 'Cake.svg', category: 'food' },
  { id: 'Camel', name: 'Camel', file: 'Camel.svg', category: 'animals' },
  { id: 'Car', name: 'Car', file: 'Car.svg', category: 'transportation' },
  { id: 'Car1', name: 'Car 1', file: 'Car1.svg', category: 'transportation' },
  { id: 'Car2', name: 'Car 2', file: 'Car2.svg', category: 'transportation' },
  { id: 'Chicken', name: 'Chicken', file: 'Chicken.svg', category: 'animals' },
  { id: 'Child1', name: 'Boy 4', file: 'Child1.svg', category: 'people' },
  { id: 'Cloud1', name: 'Cloud', file: 'Cloud1.svg', category: 'things' },
  { id: 'Crab', name: 'Crab', file: 'Crab.svg', category: 'animals' },
  { id: 'Creek', name: 'Creek', file: 'Creek.svg', category: 'things' },
  { id: 'Dog', name: 'Dog', file: 'Dog.svg', category: 'animals' },
  { id: 'Dragon', name: 'Dragon', file: 'Dragon.svg', category: 'fantasy' },
  { id: 'Duck', name: 'Duck', file: 'Duck.svg', category: 'animals' },
  { id: 'Elephant', name: 'Elephant', file: 'Elephant.svg', category: 'animals' },
  { id: 'boat_1', name: 'Boat 1', file: 'boat_1.svg', category: 'transportation' },
  { id: 'bus_1', name: 'Bus 1', file: 'bus_1.svg', category: 'transportation' },
  { id: 'car_2', name: 'Car 2 New', file: 'car_2.svg', category: 'transportation' },
  { id: 'cat_1', name: 'Kitten 2', file: 'cat_1.svg', category: 'animals' },
  { id: 'dog_1', name: 'Puppy', file: 'dog_1.svg', category: 'animals' },
  { id: 'elephant_1', name: 'Baby Elephant', file: 'elephant_1.svg', category: 'animals' },
  { id: 'lion_1', name: 'Lion', file: 'lion_1.svg', category: 'animals' },
  { id: 'monkey_1', name: 'Monkey', file: 'monkey_1.svg', category: 'animals' },
  { id: 'pandamain', name: 'Panda', file: 'pandamain.svg', category: 'animals' }
];

export function SpriteGallery({ isOpen, onClose, onSelect, onPaintNew }: SpriteGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSprites = ALL_SPRITES.filter(sprite => {
    const matchesSearch = sprite.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      (Array.isArray(sprite.category)
        ? sprite.category.includes(selectedCategory)
        : sprite.category === selectedCategory);
    return matchesSearch && matchesCategory;
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

          {/* Category filter tabs */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-105'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
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
                        loading="lazy"
                        decoding="async"
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

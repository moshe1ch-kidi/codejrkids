export type ShapeDef = {
  id: string;
  name: string;
  path: string; // SVG path data (assumed 100x100 viewBox)
};

export type ShapeCategory = {
  id: string;
  title: string;
  shapes: ShapeDef[];
};

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    id: 'geometry',
    title: 'Geometry',
    shapes: [
      { id: 'rounded-rectangle', name: 'Rounded Rectangle', path: 'M 10 0 H 90 A 10 10 0 0 1 100 10 V 90 A 10 10 0 0 1 90 100 H 10 A 10 10 0 0 1 0 90 V 10 A 10 10 0 0 1 10 0 Z' },
      { id: 'circle', name: 'Circle', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z' },
      { id: 'ellipse', name: 'Ellipse', path: 'M 50 20 A 50 30 0 1 1 49.9 20 Z' },
      { id: 'diamond', name: 'Diamond', path: 'M 50 0 L 100 50 L 50 100 L 0 50 Z' },
      { id: 'trapezoid', name: 'Trapezoid', path: 'M 20 10 L 80 10 L 100 90 L 0 90 Z' },
      { id: 'pentagon', name: 'Pentagon', path: 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z' },
      { id: 'hexagon', name: 'Hexagon', path: 'M 50 0 L 100 25 L 100 75 L 50 100 L 0 75 L 0 25 Z' },
      { id: 'star', name: 'Star', path: 'M 50 0 L 63 35 L 100 38 L 72 63 L 80 100 L 50 80 L 20 100 L 28 63 L 0 38 L 37 35 Z' },
    ],
  },
  {
    id: 'symbols',
    title: 'Arrows & Symbols',
    shapes: [
      { id: 'arrow', name: 'Arrow', path: 'M 0 35 H 60 V 10 L 100 50 L 60 90 V 65 H 0 Z' },
      { id: 'curved-arrow', name: 'Curved Arrow', path: 'M 10 90 Q 20 30 70 35 V 10 L 100 45 L 70 80 V 55 Q 35 52 25 90 Z' },
      { id: 'cross', name: 'Plus / Cross', path: 'M 35 0 H 65 V 35 H 100 V 65 H 65 V 100 H 35 V 65 H 0 V 35 H 35 Z' },
      { id: 'x-mark', name: 'X Mark', path: 'M 15 0 L 50 35 L 85 0 L 100 15 L 65 50 L 100 85 L 85 100 L 50 65 L 15 100 L 0 85 L 35 50 L 0 15 Z' },
      { id: 'check', name: 'Checkmark', path: 'M 10 50 L 40 80 L 90 10 L 100 20 L 40 100 L 0 60 Z' },
      { id: 'heart', name: 'Heart', path: 'M 50 30 A 25 25 0 0 1 100 30 Q 100 60 50 100 Q 0 60 0 30 A 25 25 0 0 1 50 30 Z' },
      { id: 'speech-bubble', name: 'Speech Bubble', path: 'M 0 20 Q 0 0 20 0 L 80 0 Q 100 0 100 20 L 100 60 Q 100 80 80 80 L 40 80 L 10 100 L 20 80 Q 0 80 0 60 Z' },
    ],
  },
  {
    id: 'nature',
    title: 'Nature & Weather',
    shapes: [
      { id: 'sun', name: 'Sun', path: 'M 50 20 A 30 30 0 1 1 49.9 20 Z M 50 0 V 10 M 50 90 V 100 M 0 50 H 10 M 90 50 H 100 M 15 15 L 22 22 M 78 78 L 85 85 M 15 85 L 22 78 M 78 15 L 85 22' },
      { id: 'cloud', name: 'Cloud', path: 'M 30 50 A 20 20 0 0 1 50 20 A 30 30 0 0 1 90 40 A 20 20 0 0 1 80 80 L 30 80 A 20 20 0 0 1 30 50 Z' },
      { id: 'lightning', name: 'Lightning', path: 'M 45 0 H 90 L 45 45 H 75 L 10 100 L 30 55 H 10 Z' },
      { id: 'tree', name: 'Tree', path: 'M 50 0 L 100 60 L 70 60 L 90 80 L 60 80 L 60 100 L 40 100 L 40 80 L 10 80 L 30 60 L 0 60 Z' },
      { id: 'flower', name: 'Flower', path: 'M 50 25 A 15 15 0 0 1 68 32 A 15 15 0 0 1 75 50 A 15 15 0 0 1 68 68 A 15 15 0 0 1 50 75 A 15 15 0 0 1 32 68 A 15 15 0 0 1 25 50 A 15 15 0 0 1 32 32 A 15 15 0 0 1 50 25 Z' },
    ],
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    shapes: [
      { id: 'car', name: 'Car', path: 'M 15 60 L 25 35 Q 30 20 45 20 H 65 Q 75 20 82 35 L 90 60 H 95 Q 100 60 100 68 V 80 H 0 V 68 Q 0 60 5 60 Z M 25 75 A 10 10 0 1 0 25 95 A 10 10 0 0 0 25 75 Z M 75 75 A 10 10 0 1 0 75 95 A 10 10 0 0 0 75 75 Z' },
      { id: 'bus', name: 'Bus', path: 'M 10 10 H 90 Q 100 10 100 20 V 80 H 90 V 90 H 75 V 80 H 25 V 90 H 10 V 80 H 0 V 20 Q 0 10 10 10 Z M 15 25 H 85 V 45 H 15 Z M 20 65 A 6 6 0 1 0 20 77 A 6 6 0 0 0 20 65 Z M 80 65 A 6 6 0 1 0 80 77 A 6 6 0 0 0 80 65 Z' },
      { id: 'airplane', name: 'Airplane', path: 'M 50 0 L 60 35 L 100 55 V 68 L 60 55 L 60 85 L 75 95 V 100 L 50 92 L 25 100 V 95 L 40 85 L 40 55 L 0 68 V 55 L 40 35 Z' },
      { id: 'boat', name: 'Boat', path: 'M 50 0 L 50 65 H 10 V 65 L 20 90 Q 25 100 50 100 Q 75 100 80 90 L 90 65 H 50 Z M 55 10 L 85 55 H 55 Z' },
      { id: 'rocket', name: 'Rocket', path: 'M 50 0 C 70 20 75 50 75 75 L 90 90 L 70 85 L 50 100 L 30 85 L 10 90 L 25 75 C 25 50 30 20 50 0 Z M 50 30 A 10 10 0 1 0 50 50 A 10 10 0 0 0 50 30 Z' },
    ],
  },
  {
    id: 'objects',
    title: 'Objects',
    shapes: [
      { id: 'house', name: 'House', path: 'M 50 0 L 100 40 L 90 40 L 90 100 L 10 100 L 10 40 L 0 40 Z M 35 60 H 65 V 100 H 35 Z' },
      { id: 'book', name: 'Book', path: 'M 50 20 C 30 10 10 15 0 20 V 90 C 10 85 30 80 50 90 C 70 80 90 85 100 90 V 20 C 90 15 70 10 50 20 Z M 50 20 V 90' },
      { id: 'pencil', name: 'Pencil', path: 'M 80 0 L 100 20 L 35 85 L 0 100 L 15 65 Z M 20 70 L 30 80 M 65 15 L 85 35' },
      { id: 'ball', name: 'Ball', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z M 20 20 Q 50 50 80 20 M 20 80 Q 50 50 80 80 M 50 0 V 100' },
      { id: 'lightbulb', name: 'Lightbulb', path: 'M 35 70 A 35 35 0 1 1 65 70 V 85 H 35 Z M 35 90 H 65 V 100 H 35 Z' },
    ],
  }
];

// Flat fallback for backward compatibility
export const SHAPE_ROWS = SHAPE_CATEGORIES.map(cat => cat.shapes);

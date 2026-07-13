export type ShapeDef = {
  id: string;
  name: string;
  path: string; // SVG path data (assumed 100x100 viewBox)
};

export const SHAPE_ROWS = [
  // Row 1
  [
    { id: 'circle', name: 'Circle', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z' },
    { id: 'triangle', name: 'Equilateral Triangle', path: 'M 50 0 L 100 100 L 0 100 Z' },
    { id: 'right-triangle', name: 'Right Triangle', path: 'M 0 0 L 100 100 L 0 100 Z' },
    { id: 'parallelogram', name: 'Parallelogram', path: 'M 20 0 L 100 0 L 80 100 L 0 100 Z' },
    { id: 'trapezoid', name: 'Trapezoid', path: 'M 20 0 L 80 0 L 100 100 L 0 100 Z' },
    { id: 'rhombus', name: 'Rhombus', path: 'M 50 0 L 100 50 L 50 100 L 0 50 Z' },
    { id: 'pentagon', name: 'Pentagon', path: 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z' },
    { id: 'hexagon', name: 'Hexagon', path: 'M 50 0 L 100 25 L 100 75 L 50 100 L 0 75 L 0 25 Z' },
  ],
  // Row 2
  [
    { id: 'pie', name: 'Pie', path: 'M 50 50 L 100 50 A 50 50 0 1 1 50 0 Z' },
    { id: 'teardrop', name: 'Teardrop', path: 'M 50 0 Q 100 50 100 75 A 50 25 0 0 1 0 75 Q 0 50 50 0 Z' },
    { id: 'speech-bubble', name: 'Speech Bubble', path: 'M 0 20 Q 0 0 20 0 L 80 0 Q 100 0 100 20 L 100 60 Q 100 80 80 80 L 40 80 L 10 100 L 20 80 Q 0 80 0 60 Z' },
    { id: 'hollow-square', name: 'Frame', path: 'M 0 0 L 100 0 L 100 100 L 0 100 Z M 20 20 L 20 80 L 80 80 L 80 20 Z' },
    { id: 'l-shape', name: 'L', path: 'M 0 0 L 30 0 L 30 70 L 100 70 L 100 100 L 0 100 Z' },
    { id: 'hollow-corner', name: 'Corner', path: 'M 0 0 L 100 0 L 100 30 L 30 30 L 30 100 L 0 100 Z' },
    { id: 'step', name: 'Step', path: 'M 0 50 L 50 50 L 50 0 L 100 0 L 100 50 L 50 50 L 50 100 L 0 100 Z' },
    { id: 'plus', name: 'Plus', path: 'M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z' },
    { id: 'star-4', name: 'Star 4', path: 'M 50 0 Q 50 50 100 50 Q 50 50 50 100 Q 50 50 0 50 Q 50 50 50 0 Z' },
    { id: 'cylinder', name: 'Cylinder', path: 'M 0 20 A 50 20 0 0 0 100 20 L 100 80 A 50 20 0 0 1 0 80 Z M 0 20 A 50 20 0 0 1 100 20 A 50 20 0 0 1 0 20 Z' },
    { id: 'cube', name: 'Cube', path: 'M 0 30 L 50 0 L 100 30 L 100 80 L 50 100 L 0 80 Z M 0 30 L 50 60 L 100 30 M 50 60 L 50 100' },
  ],
  // Row 3
  [
    { id: '3d-button', name: 'Button', path: 'M 0 0 L 100 0 L 100 100 L 0 100 Z M 15 15 L 85 15 L 85 85 L 15 85 Z M 0 0 L 15 15 M 100 0 L 85 15 M 100 100 L 85 85 M 0 100 L 15 85' },
    { id: 'ring', name: 'Ring', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z M 50 20 A 30 30 0 1 0 50.1 20 Z' },
    { id: 'no-entry', name: 'No Entry', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z M 15 15 L 85 85' },
    { id: 'arch', name: 'Thick Arch', path: 'M 0 100 A 50 50 0 0 1 100 100 L 70 100 A 20 20 0 0 0 30 100 Z' },
    { id: 'folded-paper', name: 'Paper', path: 'M 10 0 L 70 0 L 100 30 L 100 100 L 10 100 Z M 70 0 L 70 30 L 100 30' },
    { id: 'smiley', name: 'Smiley', path: 'M 50 0 A 50 50 0 1 1 49.9 0 Z M 30 35 A 5 5 0 1 1 29.9 35 Z M 70 35 A 5 5 0 1 1 69.9 35 Z M 30 65 Q 50 85 70 65' },
    { id: 'heart', name: 'Heart', path: 'M 50 30 A 25 25 0 0 1 100 30 Q 100 60 50 100 Q 0 60 0 30 A 25 25 0 0 1 50 30 Z' },
    { id: 'lightning', name: 'Lightning', path: 'M 40 0 L 100 0 L 50 50 L 80 50 L 0 100 L 30 40 L 0 40 Z' },
    { id: 'sun', name: 'Sun', path: 'M 50 20 A 30 30 0 1 1 49.9 20 Z M 50 0 L 50 10 M 50 90 L 50 100 M 0 50 L 10 50 M 90 50 L 100 50 M 15 15 L 22 22 M 78 78 L 85 85 M 15 85 L 22 78 M 78 15 L 85 22' },
    { id: 'moon', name: 'Moon', path: 'M 50 0 A 50 50 0 1 0 100 50 A 40 40 0 0 1 50 0 Z' },
    { id: 'cloud', name: 'Cloud', path: 'M 30 50 A 20 20 0 0 1 50 20 A 30 30 0 0 1 90 40 A 20 20 0 0 1 80 80 L 30 80 A 20 20 0 0 1 30 50 Z' },
    { id: 'arc', name: 'Arc', path: 'M 0 100 Q 50 0 100 100' },
  ]
];

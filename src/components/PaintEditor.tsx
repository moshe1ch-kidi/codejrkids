  import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Undo, Redo, Camera, Check, ArrowUpRight, 
  RotateCw, Copy, Scissors, PaintBucket,
  Brush, Circle, Square, Triangle, Shapes, X, Pencil, Eraser,
  Heart, Sun, Car, Lightbulb
} from 'lucide-react';
import { SHAPE_CATEGORIES } from '../lib/shapes';

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: 'brush' | 'circle' | 'rect' | 'triangle' | 'image' | 'custom' | 'eraser';
  color: string; // Used for stroke
  width: number;
  points: Point[];
  fillColor?: string;
  imgUrl?: string;
  pathData?: string;
  noStroke?: boolean;
}

type ToolType = 'brush' | 'circle' | 'rect' | 'triangle' | 'select' | 'rotate' | 'stamp' | 'scissors' | 'camera' | 'fill' | 'custom' | 'eraser';

export interface PaintEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, dataUrl: string, shapes?: Shape[]) => void;
  initialName?: string;
  initialShapes?: Shape[];
  initialSpriteUrl?: string;
  isBackground?: boolean;
}

const PALETTE_COLORS_ROW1 = [
  '#FFCDD2', '#F8BBD0', '#E1BEE7', '#FF8A80', '#FF1744', 
  '#FFB74D', '#FF9100', '#FFEA00', '#FFF9C4', '#EEFF41', 
  '#76FF03', '#00E676', '#1DE9B6', '#00E5FF', '#1B5E20', 
  '#FFFFFF', '#CFD8DC', '#37474F', '#000000'
];

const PALETTE_COLORS_ROW2 = [
  '#E040FB', '#FF4081', '#B388FF', '#651FFF', '#3D5AFE', 
  '#1A237E', '#2979FF', '#29B6F6', '#00B0FF', '#00E5FF', 
  '#E0F7FA', '#5D4037', '#8D6E63', '#D7CCC8', '#FFCC80', 
  '#FFE0B2', '#FFAB91', '#B0BEC5', '#212121'
];


// Geometry Helpers
function isPointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y))
        && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegmentSquared(p: Point, v: Point, w: Point) {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2);
}

function distToSegment(p: Point, v: Point, w: Point) {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}

function getCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 225, y: 225 };
  let sumX = 0, sumY = 0;
  points.forEach(p => { sumX += p.x; sumY += p.y; });
  return { x: sumX / points.length, y: sumY / points.length };
}

function rotatePoint(p: Point, center: Point, angle: number): Point {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const px = p.x - center.x;
  const py = p.y - center.y;
  return {
    x: px * c - py * s + center.x,
    y: px * s + py * c + center.y
  };
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const floodFill = (imgData: ImageData, x: number, y: number, fillColor: { r: number, g: number, b: number }) => {
  const data = imgData.data;
  const width = imgData.width;
  const height = imgData.height;
  const stack = [[x, y]];
  const targetIdx = (y * width + x) * 4;
  const targetColor = {
    r: data[targetIdx],
    g: data[targetIdx + 1],
    b: data[targetIdx + 2],
    a: data[targetIdx + 3]
  };

  const isTransparentTarget = targetColor.a < 15;

  if (!isTransparentTarget && targetColor.r === fillColor.r && targetColor.g === fillColor.g && targetColor.b === fillColor.b && targetColor.a === 255) {
    return;
  }

  const tolerance = isTransparentTarget ? 20 : 45;

  const colorMatch = (idx: number) => {
    if (isTransparentTarget) {
      return data[idx + 3] < 20;
    }
    return Math.abs(data[idx] - targetColor.r) <= tolerance &&
           Math.abs(data[idx + 1] - targetColor.g) <= tolerance &&
           Math.abs(data[idx + 2] - targetColor.b) <= tolerance &&
           data[idx + 3] >= 15;
  };

  while (stack.length > 0) {
    const [currX, currY] = stack.pop()!;
    let left = currX;
    while (left > 0 && colorMatch((currY * width + (left - 1)) * 4)) {
      left--;
    }
    let right = currX;
    while (right < width - 1 && colorMatch((currY * width + (right + 1)) * 4)) {
      right++;
    }

    for (let i = left; i <= right; i++) {
      const idx = (currY * width + i) * 4;
      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = 255;

      if (currY > 0 && colorMatch(((currY - 1) * width + i) * 4)) {
        stack.push([i, currY - 1]);
      }
      if (currY < height - 1 && colorMatch(((currY + 1) * width + i) * 4)) {
        stack.push([i, currY + 1]);
      }
    }
  }
};

function getBrushBoundingBox(points: Point[]) {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, maxX, minY, maxY };
}

function getShapesBoundingBox(shapesList: Shape[]) {
  if (shapesList.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  shapesList.forEach(shape => {
    shape.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });
  if (minX === Infinity) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return { minX, maxX, minY, maxY };
}

function trimCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasPixels = true;
      }
    }
  }

  if (!hasPixels) {
    return canvas.toDataURL('image/png');
  }

  // Add 10px of padding to prevent antialiasing edges from clipping
  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = croppedWidth;
  tempCanvas.height = croppedHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return canvas.toDataURL('image/png');

  tempCtx.drawImage(
    canvas,
    minX, minY, croppedWidth, croppedHeight,
    0, 0, croppedWidth, croppedHeight
  );

  return tempCanvas.toDataURL('image/png');
}

async function parseSvgTextToShapes(svgText: string): Promise<Shape[]> {
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '0px';
    tempContainer.style.height = '0px';
    tempContainer.style.overflow = 'hidden';
    document.body.appendChild(tempContainer);

    tempContainer.innerHTML = svgText;
    const svgEl = tempContainer.querySelector('svg');
    if (!svgEl) {
      document.body.removeChild(tempContainer);
      return [];
    }

    let viewBoxWidth = 450;
    let viewBoxHeight = 450;
    let viewBoxX = 0;
    let viewBoxY = 0;

    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));
      if (parts.length === 4) {
        viewBoxX = parts[0];
        viewBoxY = parts[1];
        viewBoxWidth = parts[2];
        viewBoxHeight = parts[3];
      }
    } else {
      const widthAttr = svgEl.getAttribute('width');
      const heightAttr = svgEl.getAttribute('height');
      if (widthAttr) viewBoxWidth = parseFloat(widthAttr) || 450;
      if (heightAttr) viewBoxHeight = parseFloat(heightAttr) || 450;
    }

    const targetSize = 340;
    const scale = Math.min(targetSize / viewBoxWidth, targetSize / viewBoxHeight);
    const offsetX = (450 - viewBoxWidth * scale) / 2 - viewBoxX * scale;
    const offsetY = (450 - viewBoxHeight * scale) / 2 - viewBoxY * scale;

    const elements = svgEl.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
    const parsedShapes: Shape[] = [];

    elements.forEach((el, index) => {
      const tagName = el.tagName.toLowerCase();
      const style = window.getComputedStyle(el);
      
      const rawFill = el.getAttribute('fill') || style.fill || 'transparent';
      const rawStroke = el.getAttribute('stroke') || style.stroke || '#000000';
      const strokeWidthVal = el.getAttribute('stroke-width') || style.strokeWidth || '2';

      const parseSvgColor = (colorStr: string | null): string => {
        if (!colorStr) return 'transparent';
        const clean = colorStr.trim().toLowerCase();
        if (clean === 'none' || clean === 'transparent' || clean === 'inherit' || clean === 'currentcolor') {
          return 'transparent';
        }
        return colorStr;
      };

      const fillColor = parseSvgColor(rawFill);
      const strokeColor = parseSvgColor(rawStroke);
      const strokeWidth = Math.max(1, Math.round((parseFloat(strokeWidthVal) || 2) * scale));

      const matrix = (el as any).getCTM ? (el as any).getCTM() : null;
      const transformPoint = (px: number, py: number) => {
        if (matrix) {
          const tx = px * matrix.a + py * matrix.c + matrix.e;
          const ty = px * matrix.b + py * matrix.d + matrix.f;
          return { x: tx, y: ty };
        }
        return { x: px, y: py };
      };

      if (tagName === 'path') {
        const pathEl = el as SVGPathElement;
        const d = pathEl.getAttribute('d') || '';
        // Split complex paths with multiple "M" commands to avoid distortion
        const subPaths = d.split(/(?=M)/i).filter(p => p.trim().length > 0);
        
        subPaths.forEach((subD, subIndex) => {
          const subPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          subPathEl.setAttribute('d', subD);
          svgEl.appendChild(subPathEl);
          
          const totalLength = subPathEl.getTotalLength();
          const points: Point[] = [];
          if (totalLength > 0) {
            const step = Math.max(1, Math.min(5, totalLength / 50));
            for (let dist = 0; dist <= totalLength; dist += step) {
              const pt = subPathEl.getPointAtLength(dist);
              const transformed = transformPoint(pt.x, pt.y);
              points.push({
                x: transformed.x * scale + offsetX,
                y: transformed.y * scale + offsetY
              });
            }
          }
          
          if (points.length > 0) {
            parsedShapes.push({
              id: `svg-shape-${index}-${subIndex}-${Date.now()}`,
              type: 'brush',
              color: strokeColor === 'transparent' ? '#000000' : strokeColor,
              width: strokeWidth,
              points,
              fillColor: fillColor,
              noStroke: strokeColor === 'transparent'
            });
          }
          svgEl.removeChild(subPathEl);
        });
      } else {
        let points: Point[] = [];
        if (tagName === 'rect') {
          const rx = parseFloat(el.getAttribute('x') || '0');
          const ry = parseFloat(el.getAttribute('y') || '0');
          const rw = parseFloat(el.getAttribute('width') || '0');
          const rh = parseFloat(el.getAttribute('height') || '0');
          const pts = [{ x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }, { x: rx, y: ry }];
          points = pts.map(p => {
            const t = transformPoint(p.x, p.y);
            return { x: t.x * scale + offsetX, y: t.y * scale + offsetY };
          });
        } else if (tagName === 'circle' || tagName === 'ellipse') {
          const cx = parseFloat(el.getAttribute('cx') || '0');
          const cy = parseFloat(el.getAttribute('cy') || '0');
          const rx = parseFloat(el.getAttribute('r') || el.getAttribute('rx') || '0');
          const ry = parseFloat(el.getAttribute('r') || el.getAttribute('ry') || '0');
          const steps = 32;
          for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const t = transformPoint(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
            points.push({ x: t.x * scale + offsetX, y: t.y * scale + offsetY });
          }
        } else if (tagName === 'polygon' || tagName === 'polyline') {
          const pointsAttr = el.getAttribute('points') || '';
          const coords = pointsAttr.trim().split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));
          for (let i = 0; i < coords.length; i += 2) {
            const t = transformPoint(coords[i], coords[i+1]);
            points.push({ x: t.x * scale + offsetX, y: t.y * scale + offsetY });
          }
          if (tagName === 'polygon' && points.length > 0) points.push({ ...points[0] });
        }

        if (points.length > 0) {
          parsedShapes.push({
            id: `svg-shape-${index}-${Date.now()}`,
            type: tagName === 'rect' ? 'rect' : tagName === 'circle' || tagName === 'ellipse' ? 'circle' : 'brush',
            color: strokeColor === 'transparent' ? '#000000' : strokeColor,
            width: strokeWidth,
            points,
            fillColor: fillColor,
            noStroke: strokeColor === 'transparent'
          });
        }
      }
    });

    document.body.removeChild(tempContainer);
    return parsedShapes;
  } catch (err) {
    console.error('Error parsing SVG:', err);
    return [];
  }
}

function PaintBucketIcon({ className = "w-6 h-6", color = "#f59e0b" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark arch handle at top-left */}
      <path d="M 9 11 C 6 5, 15 2.5, 17 8.5" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Tilted light-grey bucket body */}
      <path 
        d="M 11 8.5 L 18 11 C 19.5 11.5 20 13.5 19 15 L 14.5 23 C 13.5 24.5 11.5 24.5 10 23.5 L 5.5 18 C 4.5 17 4.5 15 5.5 13.5 L 9.5 9 C 10 8.2 10.5 8.2 11 8.5 Z" 
        fill="#dce3eb" 
        stroke="#475569" 
        strokeWidth="1.2" 
        strokeLinejoin="round" 
      />
      
      {/* Dripping paint stream pouring down from top-right to bottom-right tip */}
      <path 
        d="M 15.5 11 C 18.5 10.5, 21.5 12, 22.5 15.5 L 23.5 23.5 C 23.5 27, 19.5 27, 19.5 23.5 L 19.5 17 C 19 14.5 17.5 12.5 15.5 11 Z" 
        fill={color} 
        stroke="#334155" 
        strokeWidth="1" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

export function PaintEditor({
  isOpen, 
  onClose, 
  onSave, 
  initialName, 
  initialShapes, 
  initialSpriteUrl,
  isBackground = false
}: PaintEditorProps) {
  const [characterName, setCharacterName] = useState('Character');
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [activeCustomShapeData, setActiveCustomShapeData] = useState<string>('');
  const [isShapesPopoverOpen, setIsShapesPopoverOpen] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('geometry');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [colorTarget, setColorTarget] = useState<'stroke' | 'fill'>('stroke');
  const [brushWidth, setBrushWidth] = useState(8);
  
  // Vector shape state list
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  // Undo / Redo history stack of vector frames
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing / Interaction states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isReshaping, setIsReshaping] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isHoveringShape, setIsHoveringShape] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [draggedShapeStartPoints, setDraggedShapeStartPoints] = useState<Record<string, Point[]>>({});
  const [brushScalingStartBox, setBrushScalingStartBox] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);

  const [transformStartBox, setTransformStartBox] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);
  const [transformInitialPointsMap, setTransformInitialPointsMap] = useState<Record<string, Point[]> | null>(null);
  const [hoveredHandleCursor, setHoveredHandleCursor] = useState<string | null>(null);

  const [isRotatingShape, setIsRotatingShape] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [rotationInitialPoints, setRotationInitialPoints] = useState<Point[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loadedImages = useRef<{ [key: string]: HTMLImageElement }>({});

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [clickTargetCoords, setClickTargetCoords] = useState<Point | null>(null);
  const [cameraShape, setCameraShape] = useState<'rect' | 'circle' | 'triangle' | 'star'>('rect');

  // Initialize Canvas vectors with image preloading
  useEffect(() => {
    if (isOpen) {
      setCharacterName(initialName || (isBackground ? 'Background' : 'Character'));
      setActiveTool('brush');
      setSelectedColor('#000000');
      setBrushWidth(8);
      setSelectedShapeIds([]);

      const preloadAndInit = async () => {
        if (initialShapes && initialShapes.length > 0) {
          const imageShapes = initialShapes.filter(s => s.type === 'image' && s.imgUrl);
          await Promise.all(
            imageShapes.map(s => {
              return new Promise<void>((resolve) => {
                if (loadedImages.current[s.id]) {
                  resolve();
                  return;
                }
                const img = new Image();
                img.src = s.imgUrl || '';
                img.onload = () => {
                  loadedImages.current[s.id] = img;
                  resolve();
                };
                img.onerror = () => {
                  resolve();
                };
              });
            })
          );

          const clonedShapes = JSON.parse(JSON.stringify(initialShapes));
          setShapes(clonedShapes);
          setHistory([clonedShapes]);
          setHistoryIndex(0);
        } else if (initialSpriteUrl) {
          const newId = `shape-init-${Date.now()}`;
          let imgWidth = 350;
          let imgHeight = 350;

          const initImgShape: Shape = {
            id: newId,
            type: 'image',
            color: 'transparent',
            width: 0,
            noStroke: true,
            points: [],
            imgUrl: initialSpriteUrl
          };

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = initialSpriteUrl;
            img.onload = () => {
              loadedImages.current[newId] = img;
              imgWidth = img.width || 350;
              imgHeight = img.height || 350;
              
              if (isBackground) {
                initImgShape.points = [
                  { x: 0, y: 0 },
                  { x: 450, y: 0 },
                  { x: 450, y: 450 },
                  { x: 0, y: 450 }
                ];
              } else {
                const maxDim = 350;
                const ratio = Math.min(maxDim / imgWidth, maxDim / imgHeight);
                const finalW = imgWidth * ratio;
                const finalH = imgHeight * ratio;
                const startX = (450 - finalW) / 2;
                const startY = (450 - finalH) / 2;
                
                initImgShape.points = [
                  { x: startX, y: startY },
                  { x: startX + finalW, y: startY },
                  { x: startX + finalW, y: startY + finalH },
                  { x: startX, y: startY + finalH }
                ];
              }
              resolve();
            };
            img.onerror = () => resolve();
          });

          setShapes([initImgShape]);
          setHistory([[initImgShape]]);
          setHistoryIndex(0);
        } else {
          setShapes([]);
          setHistory([[]]);
          setHistoryIndex(0);
        }
      };

      preloadAndInit();
    }
  }, [isOpen, initialName, initialShapes, initialSpriteUrl, isBackground]);

  // History Helper
  const saveStateToHistory = (newShapes: Shape[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, newShapes]);
    setHistoryIndex(nextHistory.length);
    setShapes(newShapes);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setShapes(history[prevIndex]);
      setHistoryIndex(prevIndex);
      setSelectedShapeIds([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setShapes(history[nextIndex]);
      setHistoryIndex(nextIndex);
      setSelectedShapeIds([]);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedShapeIds.length > 0) {
      const isFillMode = activeTool === 'fill' || colorTarget === 'fill';
      const updated = shapes.map(s => {
        if (selectedShapeIds.includes(s.id)) {
          if (isFillMode) {
            return { ...s, fillColor: color };
          } else {
            return { ...s, color: color };
          }
        }
        return s;
      });
      saveStateToHistory(updated);
    }
  };

  const handleBrushWidthSelect = (width: number) => {
    setBrushWidth(width);
    if (selectedShapeIds.length > 0) {
      const updated = shapes.map(s => {
        if (selectedShapeIds.includes(s.id)) {
          return { ...s, width: width };
        }
        return s;
      });
      saveStateToHistory(updated);
    }
  };

  // Find shape at given (x,y) coordinate with buffer
  const findShapeAtPosition = (x: number, y: number): Shape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];

      // Check click directly near control point handles
      for (const pt of shape.points) {
        if (Math.hypot(pt.x - x, pt.y - y) < 18) {
          return shape;
        }
      }

      if ((shape.type === 'circle' || shape.type === 'custom' || shape.type === 'image') && shape.points.length >= 4) {
        const centroid = getCentroid(shape.points);
        const minX = Math.min(...shape.points.map(p => p.x));
        const maxX = Math.max(...shape.points.map(p => p.x));
        const minY = Math.min(...shape.points.map(p => p.y));
        const maxY = Math.max(...shape.points.map(p => p.y));
        const rx = (maxX - minX) / 2;
        const ry = (maxY - minY) / 2;
        const dx = x - centroid.x;
        const dy = y - centroid.y;
        // Use a generous hit area for these shapes
        if ((dx * dx) / ((rx + 15) * (rx + 15)) + (dy * dy) / ((ry + 15) * (ry + 15)) <= 1) {
          return shape;
        }
      } else if ((shape.type === 'rect' || shape.type === 'triangle') && shape.points.length >= 3) {
        if (isPointInPolygon({ x, y }, shape.points)) {
          return shape;
        }
        for (let j = 0; j < shape.points.length; j++) {
          const p1 = shape.points[j];
          const p2 = shape.points[(j + 1) % shape.points.length];
          if (distToSegment({ x, y }, p1, p2) < 18) {
            return shape;
          }
        }
      } else if (shape.type === 'brush') {
        for (let j = 0; j < shape.points.length - 1; j++) {
          if (distToSegment({ x, y }, shape.points[j], shape.points[j + 1]) < 20) {
            return shape;
          }
        }
      }
    }
    return null;
  };

  const isShapeInRect = (shape: Shape, rectX: number, rectY: number, rectW: number, rectH: number): boolean => {
    const minX = Math.min(rectX, rectX + rectW);
    const maxX = Math.max(rectX, rectX + rectW);
    const minY = Math.min(rectY, rectY + rectH);
    const maxY = Math.max(rectY, rectY + rectH);

    return shape.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  };

  // Rendering shapes onto Canvas
  const renderAllShapes = (ctx: CanvasRenderingContext2D, width: number, height: number, drawHandles: boolean) => {
    ctx.clearRect(0, 0, width, height);

    shapes.forEach((shape) => {
      ctx.save();
      ctx.lineWidth = shape.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = shape.color;

      if (shape.type === 'brush') {
        if (shape.points.length > 0) {
          if (shape.points.length === 1) {
            ctx.beginPath();
            ctx.arc(shape.points[0].x, shape.points[0].y, shape.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = shape.color;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            if (shape.fillColor && shape.fillColor !== 'transparent') {
              ctx.fillStyle = shape.fillColor;
              ctx.fill();
            }
            if (!shape.noStroke) {
              ctx.stroke();
            }
          }
        }
      } else if (shape.type === 'rect') {
        if (shape.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
          ctx.lineTo(shape.points[2].x, shape.points[2].y);
          ctx.lineTo(shape.points[3].x, shape.points[3].y);
          ctx.closePath();
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          if (!shape.noStroke) {
            ctx.stroke();
          }
        }
      } else if (shape.type === 'triangle') {
        if (shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
          ctx.lineTo(shape.points[2].x, shape.points[2].y);
          ctx.closePath();
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          if (!shape.noStroke) {
            ctx.stroke();
          }
        }
      } else if (shape.type === 'circle') {
        if (shape.points.length >= 4) {
          const centroid = getCentroid(shape.points);
          const rx = Math.hypot(shape.points[1].x - shape.points[3].x, shape.points[1].y - shape.points[3].y) / 2;
          const ry = Math.hypot(shape.points[0].x - shape.points[2].x, shape.points[0].y - shape.points[2].y) / 2;
          const rotation = Math.atan2(shape.points[1].y - shape.points[3].y, shape.points[1].x - shape.points[3].x);
          
          ctx.beginPath();
          ctx.ellipse(centroid.x, centroid.y, rx, ry, rotation, 0, Math.PI * 2);
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          if (!shape.noStroke) {
            ctx.stroke();
          }
        }
      } else if (shape.type === 'custom' && shape.pathData) {
        if (shape.points.length >= 4) {
          const centroid = getCentroid(shape.points);
          const rx = Math.hypot(shape.points[1].x - shape.points[3].x, shape.points[1].y - shape.points[3].y) / 2;
          const ry = Math.hypot(shape.points[0].x - shape.points[2].x, shape.points[0].y - shape.points[2].y) / 2;
          const rotation = Math.atan2(shape.points[1].y - shape.points[3].y, shape.points[1].x - shape.points[3].x);
          
          ctx.save();
          ctx.translate(centroid.x, centroid.y);
          ctx.rotate(rotation);
          ctx.scale((rx * 2) / 100, (ry * 2) / 100);
          ctx.translate(-50, -50);
          
          const path2d = new Path2D(shape.pathData);
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill(path2d);
          }
          if (!shape.noStroke) {
            // Reset scale for stroke so it doesn't get distorted
            ctx.lineWidth = shape.width / Math.max((rx * 2) / 100, (ry * 2) / 100);
            ctx.stroke(path2d);
          }
          ctx.restore();
        }
      } else if (shape.type === 'image') {
        if (shape.points.length >= 4) {
          const centroid = getCentroid(shape.points);
          const w = Math.hypot(shape.points[1].x - shape.points[0].x, shape.points[1].y - shape.points[0].y);
          const h = Math.hypot(shape.points[3].x - shape.points[0].x, shape.points[3].y - shape.points[0].y);
          const rotation = Math.atan2(shape.points[1].y - shape.points[0].y, shape.points[1].x - shape.points[0].x);

          const img = loadedImages.current[shape.id];
          if (img) {
            ctx.save();
            ctx.translate(centroid.x, centroid.y);
            ctx.rotate(rotation);
            ctx.drawImage(img, -w/2, -h/2, w, h);
            ctx.restore();
          } else {
            const newImg = new Image();
            newImg.src = shape.imgUrl || '';
            newImg.onload = () => {
              loadedImages.current[shape.id] = newImg;
              renderAllShapes(ctx, width, height, drawHandles);
            };
          }
        }
      } else if (shape.type === 'eraser') {
        if (shape.points.length > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = shape.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000';
          ctx.fillStyle = '#000000';
          if (shape.points.length === 1) {
            ctx.beginPath();
            ctx.arc(shape.points[0].x, shape.points[0].y, shape.width / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    });

    // Draw Google DRAW style bounding box & handles for selected shapes
    if (drawHandles && activeTool === 'select' && selectedShapeIds.length > 0) {
      const selectedShapesList = shapes.filter(s => selectedShapeIds.includes(s.id));
      if (selectedShapesList.length > 0) {
        const box = getShapesBoundingBox(selectedShapesList);
        const minX = box.minX;
        const maxX = box.maxX;
        const minY = box.minY;
        const maxY = box.maxY;
        const w = maxX - minX;
        const h = maxY - minY;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // 1. Draw solid blue bounding box
        ctx.save();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(minX, minY, Math.max(1, w), Math.max(1, h));
        ctx.restore();

        // Helper to draw pill handle
        const drawPillHandle = (hx: number, hy: number, pw: number, ph: number) => {
          ctx.save();
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(hx - pw / 2, hy - ph / 2, pw, ph, 3.5);
          } else {
            ctx.rect(hx - pw / 2, hy - ph / 2, pw, ph);
          }
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#1a73e8';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        };

        // Helper to draw circle handle
        const drawCircleHandle = (hx: number, hy: number) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#1a73e8';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        };

        // 2. Draw 4 Corner handles (TL, TR, BR, BL)
        drawCircleHandle(minX, minY);
        drawCircleHandle(maxX, minY);
        drawCircleHandle(maxX, maxY);
        drawCircleHandle(minX, maxY);

        // 3. Draw 4 Edge handles (TC, RC, BC, LC)
        drawPillHandle(cx, minY, 16, 7); // Top-Center horizontal pill
        drawPillHandle(maxX, cy, 7, 16); // Right-Center vertical pill
        drawPillHandle(cx, maxY, 16, 7); // Bottom-Center horizontal pill
        drawPillHandle(minX, cy, 7, 16); // Left-Center vertical pill

        // 4. Draw Rotation handle
        const rotY = minY - 26;
        ctx.save();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, minY);
        ctx.lineTo(cx, rotY);
        ctx.stroke();
        ctx.restore();

        // Rotation Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, rotY, 9.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a73e8';
        ctx.fill();
        ctx.restore();

        // Rotation arrow icon
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, rotY, 4.5, Math.PI * 0.25, Math.PI * 1.65);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const tipX = cx + Math.cos(Math.PI * 1.65) * 4.5;
        const tipY = rotY + Math.sin(Math.PI * 1.65) * 4.5;
        ctx.moveTo(tipX - 1, tipY - 3);
        ctx.lineTo(tipX + 3.5, tipY + 0.5);
        ctx.lineTo(tipX - 2.5, tipY + 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw marquee selection rectangle
    if (isMarqueeSelecting && marqueeRect) {
      ctx.save();
      ctx.strokeStyle = '#29b6f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const x = Math.min(marqueeRect.startX, marqueeRect.currentX);
      const y = Math.min(marqueeRect.startY, marqueeRect.currentY);
      const w = Math.abs(marqueeRect.startX - marqueeRect.currentX);
      const h = Math.abs(marqueeRect.startY - marqueeRect.currentY);
      ctx.strokeRect(x, y, w, h);
      
      ctx.fillStyle = 'rgba(41, 182, 246, 0.1)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderAllShapes(ctx, canvas.width, canvas.height, true);
  }, [shapes, selectedShapeIds, isMarqueeSelecting, marqueeRect, activeTool]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const currentPoint = { x, y };

    if (activeTool === 'fill') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape && (clickedShape.type === 'circle' || clickedShape.type === 'rect' || clickedShape.type === 'triangle' || clickedShape.type === 'custom' || clickedShape.type === 'brush')) {
        const updated = shapes.map(s => {
          if (s.id === clickedShape.id) {
            return { ...s, fillColor: selectedColor };
          }
          return s;
        });
        saveStateToHistory(updated);
        return;
      }

      // Perform full canvas flood fill on offscreen canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 450;
      offCanvas.height = 450;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        renderAllShapes(offCtx, 450, 450, false);
        const px = Math.max(0, Math.min(449, Math.floor(x)));
        const py = Math.max(0, Math.min(449, Math.floor(y)));
        const imgData = offCtx.getImageData(0, 0, 450, 450);
        const fillColorRgb = hexToRgb(selectedColor);
        floodFill(imgData, px, py, fillColorRgb);
        offCtx.putImageData(imgData, 0, 0);

        const newUrl = offCanvas.toDataURL('image/png');

        const hasImageShapes = shapes.some(s => s.type === 'image');
        const fillShapeId = `fill-bg-${Date.now()}`;

        const newFillShape: Shape = {
          id: fillShapeId,
          type: 'image',
          color: 'transparent',
          width: 0,
          noStroke: true,
          points: [
            { x: 0, y: 0 },
            { x: 450, y: 0 },
            { x: 450, y: 450 },
            { x: 0, y: 450 }
          ],
          imgUrl: newUrl
        };

        const newImg = new Image();
        newImg.src = newUrl;
        newImg.onload = () => {
          loadedImages.current[fillShapeId] = newImg;
          // When performing flood fill over the whole canvas (including erased holes),
          // the resulting image contains all prior shapes and erased cutouts baked in with the new fill.
          // Therefore, any previous eraser strokes are already baked into the new canvas snapshot.
          // We remove previous 'eraser' shapes so they don't re-erase the newly filled color!
          const nonEraserShapes = shapes.filter(s => s.type !== 'eraser' && s.type !== 'image');
          const updatedShapes: Shape[] = [newFillShape, ...nonEraserShapes];
          saveStateToHistory(updatedShapes);
        };
      }
      return;
    }

    if (activeTool === 'scissors') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        let idsToDelete = [clickedShape.id];
        if (selectedShapeIds.includes(clickedShape.id)) {
          idsToDelete = selectedShapeIds;
        }
        const updated = shapes.filter(s => !idsToDelete.includes(s.id));
        saveStateToHistory(updated);
        setSelectedShapeIds([]);
      }
      return;
    }

    if (activeTool === 'stamp') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        let idsToDuplicate = [clickedShape.id];
        if (selectedShapeIds.includes(clickedShape.id)) {
          idsToDuplicate = selectedShapeIds;
        }

        const newShapes: Shape[] = [];
        const newSelectedIds: string[] = [];

        idsToDuplicate.forEach(id => {
          const original = shapes.find(s => s.id === id);
          if (original) {
            const newId = `shape-${Date.now()}-${Math.random()}`;
            newShapes.push({
              ...original,
              id: newId,
              points: original.points.map(p => ({ x: p.x + 25, y: p.y + 25 }))
            });
            newSelectedIds.push(newId);
          }
        });

        if (newShapes.length > 0) {
          saveStateToHistory([...shapes, ...newShapes]);
          setSelectedShapeIds(newSelectedIds);
        }
      }
      return;
    }

    if (activeTool === 'rotate') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        const centroid = getCentroid(clickedShape.points);
        const updated = shapes.map(s => {
          if (s.id === clickedShape.id) {
            const rotatedPoints = s.points.map(p => rotatePoint(p, centroid, Math.PI / 2));
            
            // Reorder points for fixed-geometry shapes to keep handles and rendering consistent
            if ((s.type === 'circle' || s.type === 'custom' || s.type === 'rect' || s.type === 'image') && rotatedPoints.length === 4) {
              const [p0, p1, p2, p3] = rotatedPoints;
              rotatedPoints[0] = p3;
              rotatedPoints[1] = p0;
              rotatedPoints[2] = p1;
              rotatedPoints[3] = p2;
            } else if (s.type === 'triangle' && rotatedPoints.length === 3) {
              const [p0, p1, p2] = rotatedPoints;
              rotatedPoints[0] = p2;
              rotatedPoints[1] = p0;
              rotatedPoints[2] = p1;
            }
            
            return {
              ...s,
              points: rotatedPoints
            };
          }
          return s;
        });
        saveStateToHistory(updated);
      }
      return;
    }

    if (activeTool === 'camera') {
      startCamera(x, y);
      return;
    }

    if (activeTool === 'select') {
      if (selectedShapeIds.length > 0) {
        const selectedShapesList = shapes.filter(s => selectedShapeIds.includes(s.id));
        if (selectedShapesList.length > 0) {
          const box = getShapesBoundingBox(selectedShapesList);
          const minX = box.minX;
          const maxX = box.maxX;
          const minY = box.minY;
          const maxY = box.maxY;
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;

          const handles = [
            { id: 0, x: minX, y: minY },       // TL
            { id: 1, x: cx,   y: minY },       // TC
            { id: 2, x: maxX, y: minY },       // TR
            { id: 3, x: maxX, y: cy },         // RC
            { id: 4, x: maxX, y: maxY },       // BR
            { id: 5, x: cx,   y: maxY },       // BC
            { id: 6, x: minX, y: maxY },       // BL
            { id: 7, x: minX, y: cy },         // LC
            { id: 8, x: cx,   y: minY - 26 },  // ROTATION
          ];

          let clickedHandleIdx = -1;
          for (const h of handles) {
            if (h.id === 8) {
              if (Math.hypot(x - h.x, y - h.y) <= 12) {
                clickedHandleIdx = 8;
                break;
              }
            } else if (h.id === 1 || h.id === 5) {
              if (Math.abs(x - h.x) <= 10 && Math.abs(y - h.y) <= 7) {
                clickedHandleIdx = h.id;
                break;
              }
            } else if (h.id === 3 || h.id === 7) {
              if (Math.abs(x - h.x) <= 7 && Math.abs(y - h.y) <= 10) {
                clickedHandleIdx = h.id;
                break;
              }
            } else {
              if (Math.hypot(x - h.x, y - h.y) <= 10) {
                clickedHandleIdx = h.id;
                break;
              }
            }
          }

          if (clickedHandleIdx !== -1) {
            setIsReshaping(true);
            setSelectedPointIndex(clickedHandleIdx);
            setTransformStartBox(box);
            setDragStartPos(currentPoint);

            const initialMap: Record<string, Point[]> = {};
            selectedShapesList.forEach(s => {
              initialMap[s.id] = s.points.map(p => ({ ...p }));
            });
            setTransformInitialPointsMap(initialMap);

            if (clickedHandleIdx === 8) {
              setIsRotatingShape(true);
              const startAngle = Math.atan2(y - cy, x - cx);
              setRotationStartAngle(startAngle);
            }
            return;
          }
        }
      }

      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        let newSelection = selectedShapeIds;
        if (!selectedShapeIds.includes(clickedShape.id)) {
          newSelection = [clickedShape.id];
          setSelectedShapeIds(newSelection);
        }
        setIsDraggingShape(true);
        setDragStartPos(currentPoint);
        const initialPointsMap: Record<string, Point[]> = {};
        shapes.forEach(s => {
          if (newSelection.includes(s.id)) {
            initialPointsMap[s.id] = s.points.map(p => ({ ...p }));
          }
        });
        setDraggedShapeStartPoints(initialPointsMap);
      } else {
        setIsMarqueeSelecting(true);
        setMarqueeRect({ startX: x, startY: y, currentX: x, currentY: y });
        setSelectedShapeIds([]);
      }
      return;
    }

    // Draw shapes mode
    setIsDrawing(true);
    setDragStartPos(currentPoint);

    const newId = `shape-${Date.now()}`;
    let newShape: Shape | null = null;

    if (activeTool === 'brush') {
      newShape = {
        id: newId,
        type: 'brush',
        color: selectedColor,
        width: brushWidth,
        points: [currentPoint],
        fillColor: 'transparent'
      };
    } else if (activeTool === 'rect') {
      newShape = {
        id: newId,
        type: 'rect',
        color: selectedColor,
        width: brushWidth,
        points: [
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint }
        ],
        fillColor: 'transparent'
      };
    } else if (activeTool === 'triangle') {
      newShape = {
        id: newId,
        type: 'triangle',
        color: selectedColor,
        width: brushWidth,
        points: [
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint }
        ],
        fillColor: 'transparent'
      };
    } else if (activeTool === 'circle') {
      newShape = {
        id: newId,
        type: 'circle',
        color: selectedColor,
        width: brushWidth,
        points: [
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint }
        ],
        fillColor: 'transparent'
      };
    } else if (activeTool === 'custom') {
      newShape = {
        id: newId,
        type: 'custom',
        pathData: activeCustomShapeData,
        color: selectedColor,
        width: brushWidth,
        points: [
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint },
          { ...currentPoint }
        ],
        fillColor: 'transparent'
      };
    } else if (activeTool === 'eraser') {
      newShape = {
        id: newId,
        type: 'eraser',
        color: 'transparent',
        width: brushWidth * 1.5,
        points: [currentPoint],
        fillColor: 'transparent'
      };
    }

    if (newShape) {
      setShapes([...shapes, newShape]);
      setSelectedShapeIds([newId]);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const currentPoint = { x, y };

    if (activeTool === 'select') {
      if (isMarqueeSelecting && marqueeRect) {
        setMarqueeRect(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
        return;
      }

      if (isReshaping && selectedPointIndex !== null && transformStartBox && transformInitialPointsMap) {
        if (selectedPointIndex === 8) {
          // Rotation
          const box = transformStartBox;
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;
          const currentAngle = Math.atan2(y - cy, x - cx);
          const deltaAngle = currentAngle - rotationStartAngle;

          setShapes(prev => prev.map(s => {
            if (!selectedShapeIds.includes(s.id)) return s;
            const initialPoints = transformInitialPointsMap[s.id];
            if (!initialPoints) return s;

            return {
              ...s,
              points: initialPoints.map(p => rotatePoint(p, { x: cx, y: cy }, deltaAngle))
            };
          }));
        } else {
          // Resize / Stretch handles (0..7)
          const box = transformStartBox;
          let newMinX = box.minX;
          let newMaxX = box.maxX;
          let newMinY = box.minY;
          let newMaxY = box.maxY;

          switch (selectedPointIndex) {
            case 0: newMinX = x; newMinY = y; break; // TL
            case 1: newMinY = y; break;              // TC
            case 2: newMaxX = x; newMinY = y; break; // TR
            case 3: newMaxX = x; break;              // RC
            case 4: newMaxX = x; newMaxY = y; break; // BR
            case 5: newMaxY = y; break;              // BC
            case 6: newMinX = x; newMaxY = y; break; // BL
            case 7: newMinX = x; break;              // LC
          }

          const origW = box.maxX - box.minX || 1;
          const origH = box.maxY - box.minY || 1;
          const newW = newMaxX - newMinX;
          const newH = newMaxY - newMinY;

          setShapes(prev => prev.map(s => {
            if (!selectedShapeIds.includes(s.id)) return s;
            const initialPoints = transformInitialPointsMap[s.id];
            if (!initialPoints) return s;

            return {
              ...s,
              points: initialPoints.map(p => {
                const u = (p.x - box.minX) / origW;
                const v = (p.y - box.minY) / origH;
                return {
                  x: newMinX + u * newW,
                  y: newMinY + v * newH
                };
              })
            };
          }));
        }
      } else if (isDraggingShape && selectedShapeIds.length > 0) {
        const dx = x - dragStartPos.x;
        const dy = y - dragStartPos.y;
        
        setShapes(prev => prev.map(shape => {
          if (!selectedShapeIds.includes(shape.id)) return shape;
          
          const initialPoints = draggedShapeStartPoints[shape.id];
          if (!initialPoints) return shape;

          return {
            ...shape,
            points: initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }));
      } else {
        // Pointer hovering over handles or shape
        let handleCursor: string | null = null;
        if (selectedShapeIds.length > 0) {
          const selectedShapesList = shapes.filter(s => selectedShapeIds.includes(s.id));
          if (selectedShapesList.length > 0) {
            const box = getShapesBoundingBox(selectedShapesList);
            const minX = box.minX, maxX = box.maxX, minY = box.minY, maxY = box.maxY;
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

            const handles = [
              { id: 0, x: minX, y: minY, cursor: 'nwse-resize' },
              { id: 1, x: cx,   y: minY, cursor: 'ns-resize' },
              { id: 2, x: maxX, y: minY, cursor: 'nesw-resize' },
              { id: 3, x: maxX, y: cy,   cursor: 'ew-resize' },
              { id: 4, x: maxX, y: maxY, cursor: 'nwse-resize' },
              { id: 5, x: cx,   y: maxY, cursor: 'ns-resize' },
              { id: 6, x: minX, y: maxY, cursor: 'nesw-resize' },
              { id: 7, x: minX, y: cy,   cursor: 'ew-resize' },
              { id: 8, x: cx,   y: minY - 26, cursor: 'grab' },
            ];

            for (const h of handles) {
              if (h.id === 8 && Math.hypot(x - h.x, y - h.y) <= 12) {
                handleCursor = h.cursor;
                break;
              } else if ((h.id === 1 || h.id === 5) && Math.abs(x - h.x) <= 10 && Math.abs(y - h.y) <= 7) {
                handleCursor = h.cursor;
                break;
              } else if ((h.id === 3 || h.id === 7) && Math.abs(x - h.x) <= 7 && Math.abs(y - h.y) <= 10) {
                handleCursor = h.cursor;
                break;
              } else if (h.id !== 8 && h.id !== 1 && h.id !== 5 && h.id !== 3 && h.id !== 7 && Math.hypot(x - h.x, y - h.y) <= 10) {
                handleCursor = h.cursor;
                break;
              }
            }
          }
        }
        setHoveredHandleCursor(handleCursor);
        const hovered = findShapeAtPosition(x, y);
        setIsHoveringShape(!!hovered);
      }
      return;
    }

    if (!isDrawing) return;

    setShapes(prev => prev.map(shape => {
      if (!selectedShapeIds.includes(shape.id)) return shape;

      if (shape.type === 'brush' || shape.type === 'eraser') {
        return { ...shape, points: [...shape.points, currentPoint] };
      }

      const x0 = dragStartPos.x;
      const y0 = dragStartPos.y;

      if (shape.type === 'rect') {
        return {
          ...shape,
          points: [
            { x: x0, y: y0 },
            { x: x, y: y0 },
            { x: x, y: y },
            { x: x0, y: y }
          ]
        };
      }

      if (shape.type === 'triangle') {
        return {
          ...shape,
          points: [
            { x: (x0 + x) / 2, y: y0 },
            { x: x, y: y },
            { x: x0, y: y }
          ]
        };
      }

      if (shape.type === 'circle' || shape.type === 'custom') {
        const rx = Math.abs(x - x0);
        const ry = Math.abs(y - y0);
        return {
          ...shape,
          points: [
            { x: x0, y: y0 - ry },
            { x: x0 + rx, y: y0 },
            { x: x0, y: y0 + ry },
            { x: x0 - rx, y: y0 }
          ]
        };
      }

      return shape;
    }));
  };

  const stopDrawing = () => {
    if (isMarqueeSelecting && marqueeRect) {
      const x = Math.min(marqueeRect.startX, marqueeRect.currentX);
      const y = Math.min(marqueeRect.startY, marqueeRect.currentY);
      const w = Math.abs(marqueeRect.startX - marqueeRect.currentX);
      const h = Math.abs(marqueeRect.startY - marqueeRect.currentY);

      const inRectIds = shapes
        .filter(s => isShapeInRect(s, x, y, w, h))
        .map(s => s.id);
      
      setSelectedShapeIds(inRectIds);
      setIsMarqueeSelecting(false);
      setMarqueeRect(null);
      return;
    }

    if (isDrawing || isReshaping || isDraggingShape || isRotatingShape) {
      setIsDrawing(false);
      setIsReshaping(false);
      setIsDraggingShape(false);
      setIsRotatingShape(false);
      setSelectedPointIndex(null);
      setBrushScalingStartBox(null);
      setTransformStartBox(null);
      setTransformInitialPointsMap(null);
      setHoveredHandleCursor(null);
      if (activeTool === 'eraser') {
        setSelectedShapeIds([]);
      }
      saveStateToHistory(shapes);
    }
  };

  const startCamera = async (x: number, y: number) => {
    try {
      setClickTargetCoords({ x, y });
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Could not access camera.");
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !clickTargetCoords) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = 320;
    offscreen.height = 240;
    const offscreenCtx = offscreen.getContext('2d');
    if (offscreenCtx) {
      offscreenCtx.scale(-1, 1);
      offscreenCtx.drawImage(video, -320, 0, 320, 240);
      
      if (cameraShape !== 'rect') {
        offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.beginPath();
        if (cameraShape === 'circle') {
          offscreenCtx.arc(160, 120, 120, 0, Math.PI * 2);
        } else if (cameraShape === 'triangle') {
          offscreenCtx.moveTo(160, 0);
          offscreenCtx.lineTo(320, 240);
          offscreenCtx.lineTo(0, 240);
          offscreenCtx.closePath();
        } else if (cameraShape === 'star') {
          const cx = 160, cy = 120, spikes = 5, outerRadius = 120, innerRadius = 50;
          let rot = Math.PI / 2 * 3;
          let x = cx;
          let y = cy;
          let step = Math.PI / spikes;
          offscreenCtx.moveTo(cx, cy - outerRadius);
          for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            offscreenCtx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            offscreenCtx.lineTo(x, y);
            rot += step;
          }
          offscreenCtx.lineTo(cx, cy - outerRadius);
          offscreenCtx.closePath();
        }
        offscreenCtx.fillStyle = 'black';
        offscreenCtx.fill();
      }
    }
    const photoUrl = offscreen.toDataURL('image/png');

    const cx = clickTargetCoords.x;
    const cy = clickTargetCoords.y;
    const hw = 60;
    const hh = 45; // Maintain 4:3 aspect ratio (320x240)

    const newId = `shape-${Date.now()}`;
    const newImgShape: Shape = {
      id: newId,
      type: 'image',
      color: '#000000',
      width: 2,
      points: [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx + hw, y: cy + hh },
        { x: cx - hw, y: cy + hh }
      ],
      imgUrl: photoUrl
    };

    saveStateToHistory([...shapes, newImgShape]);
    setSelectedShapeIds([newId]);
    stopCameraStream();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Export clean PNG without visual handles
    renderAllShapes(ctx, canvas.width, canvas.height, false);
    const dataUrl = isBackground ? canvas.toDataURL('image/png') : trimCanvas(canvas);
    
    // Restore visual handles
    renderAllShapes(ctx, canvas.width, canvas.height, true);
    onSave(characterName || (isBackground ? 'Background' : 'Character'), dataUrl, shapes);
  };

  const getCanvasCursorStyle = () => {
    if (activeTool === 'select') {
      if (isRotatingShape) return 'grabbing';
      if (isReshaping && selectedPointIndex !== null) {
        const handleCursors = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'grabbing'];
        return handleCursors[selectedPointIndex] || 'default';
      }
      if (hoveredHandleCursor) return hoveredHandleCursor;
      if (isDraggingShape) return 'grabbing';
      if (selectedShapeIds.length > 0 || isHoveringShape) return 'grab';
      return 'default';
    }
    if (activeTool === 'fill') {
      const fillHex = selectedColor || '#f59e0b';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <path d="M 9 11 C 6 5, 15 2.5, 17 8.5" fill="none" stroke="%23334155" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 11 8.5 L 18 11 C 19.5 11.5 20 13.5 19 15 L 14.5 23 C 13.5 24.5 11.5 24.5 10 23.5 L 5.5 18 C 4.5 17 4.5 15 5.5 13.5 L 9.5 9 C 10 8.2 10.5 8.2 11 8.5 Z" fill="%23dce3eb" stroke="%23475569" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 15.5 11 C 18.5 10.5, 21.5 12, 22.5 15.5 L 23.5 23.5 C 23.5 27, 19.5 27, 19.5 23.5 L 19.5 17 C 19 14.5 17.5 12.5 15.5 11 Z" fill="${encodeURIComponent(fillHex)}" stroke="%23334155" stroke-width="1" stroke-linejoin="round"/>
      </svg>`;
      return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 21.5 25.5, pointer`;
    }
    if (activeTool === 'stamp') {
      return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23ec4899" stroke="%231e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M19 17H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1Z"/><path d="M12 13V8"/><path d="M12 3a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3Z"/></svg>') 12 22, copy`;
    }
    if (activeTool === 'scissors') {
      return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>') 12 12, pointer`;
    }
    if (activeTool === 'eraser') {
      const size = Math.max(16, Math.min(48, Math.round(brushWidth * 1.5)));
      const r = (size / 2) - 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="rgba(255,255,255,0.75)" stroke="%23334155" stroke-width="2"/>
        <circle cx="${size/2}" cy="${size/2}" r="1.5" fill="%23334155"/>
      </svg>`;
      return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${size/2} ${size/2}, crosshair`;
    }
    return 'crosshair';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-[#f1ede2] w-full max-w-5xl h-[94vh] sm:h-[88vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden border-[6px] border-[#d7cfbc] z-10 select-none"
        >
          {/* Top Bar */}
          <div className="h-16 px-6 flex justify-between items-center shrink-0 border-b-2 border-[#e5dfd3] relative z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] disabled:bg-[#b0cde4] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="Undo"
              >
                <Undo className="w-5 h-5 stroke-[3]" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] disabled:bg-[#b0cde4] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="Redo"
              >
                <Redo className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

            <div className="bg-white border-2 border-slate-300 rounded-full px-8 py-1.5 shadow-sm min-w-[180px] text-center">
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="bg-transparent font-black text-[#5C6BC0] text-lg text-center outline-none w-full"
                placeholder="Character Name"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-slate-400 hover:bg-slate-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="Cancel / Close"
              >
                <X className="w-6 h-6 stroke-[3]" />
              </button>

              <button
                onClick={handleSave}
                className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="Save"
              >
                <Check className="w-6 h-6 stroke-[3.5]" />
              </button>
            </div>
          </div>

          {/* Central Workspace Panel */}
          <div className="flex-1 flex min-h-0 relative p-4 gap-4 items-stretch">
            
            {/* Draw Tools Panel */}
            <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-between py-1 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-1.5 sm:gap-2 w-full items-center">
                <button
                  onClick={() => {
                    setActiveTool('brush');
                    setColorTarget('stroke');
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === 'brush' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="Brush"
                >
                  <Brush className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => {
                    setActiveTool('circle');
                    setColorTarget('stroke');
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === 'circle' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="Circle"
                >
                  <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => {
                    setActiveTool('rect');
                    setColorTarget('stroke');
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === 'rect' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="Rectangle"
                >
                  <Square className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => {
                    setActiveTool('triangle');
                    setColorTarget('stroke');
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === 'triangle' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="Triangle"
                >
                  <Triangle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => {
                    setActiveTool('eraser');
                    setSelectedShapeIds([]);
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === 'eraser' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="Eraser"
                >
                  <Eraser className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 stroke-[2.5]" />
                </button>
              </div>

              {/* Stroke width selectors */}
              <div className="flex flex-col gap-1.5 sm:gap-2 w-full items-center pt-2 sm:pt-3 border-t border-[#e2dac6]">
                {[4, 8, 14, 22].map((width) => {
                  const isActive = brushWidth === width;
                  return (
                    <button
                      key={width}
                      onClick={() => handleBrushWidthSelect(width)}
                      className="w-12 h-6 sm:w-14 sm:h-7 relative flex items-center justify-center transition-all hover:scale-105"
                      title={`Width ${width}px`}
                    >
                      {isActive && (
                        <svg className="absolute inset-0 w-full h-full text-amber-500 fill-none" viewBox="0 0 60 30">
                          <ellipse cx="30" cy="15" rx="27" ry="12" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
                        </svg>
                      )}
                      <div className="bg-slate-800 rounded-full" style={{ width: '28px', height: `${Math.max(2.5, width * 0.55)}px` }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-white border-2 border-slate-300 rounded-[28px] overflow-hidden flex items-center justify-center p-3 shadow-inner relative">
              <div className="relative aspect-square w-full max-w-[460px] max-h-[460px] shadow-md border border-slate-200 bg-white overflow-hidden paint-checkerboard">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={450}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={(e) => {
                    setIsHoveringShape(false);
                    stopDrawing();
                  }}
                  style={{ cursor: getCanvasCursorStyle() }}
                  className="absolute inset-0 w-full h-full touch-none z-10"
                />
                <div 
                  className="absolute inset-0 pointer-events-none z-0 opacity-10" 
                  style={{
                    backgroundImage: 'linear-gradient(to right, #e91e63 1px, transparent 1px), linear-gradient(to bottom, #e91e63 1px, transparent 1px)',
                    backgroundSize: '28px 28px'
                  }}
                />
              </div>
            </div>

            {/* Right Tools (Select, Rotate, Stamp, Scissors, Camera, Bucket) */}
            <div className="w-20 sm:w-24 shrink-0 flex flex-col gap-2.5 py-1 justify-start items-center">
              <button
                onClick={() => setActiveTool('select')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'select' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="Select & Move"
              >
                <ArrowUpRight className="w-6 h-6 stroke-[3] -rotate-45" />
              </button>

              <button
                onClick={() => setActiveTool('stamp')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'stamp' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="Stamp / Duplicate"
              >
                <Copy className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setActiveTool('scissors')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'scissors' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="Delete / Cut"
              >
                <Scissors className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => {
                  setActiveTool('camera');
                  startCamera(225, 225);
                }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'camera' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="Camera"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => {
                  setActiveTool('fill');
                  setColorTarget('fill');
                }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'fill' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="Paint Bucket"
              >
                <PaintBucketIcon className="w-7 h-7" color={selectedColor || '#f59e0b'} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsShapesPopoverOpen(!isShapesPopoverOpen)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                    activeTool === 'custom' || isShapesPopoverOpen ? '!bg-indigo-500 text-white border-indigo-700 scale-105' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Special Shapes"
                >
                  <Shapes className="w-6 h-6 stroke-[2.5]" />
                </button>

                <AnimatePresence>
                  {isShapesPopoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 20 }}
                      className="absolute right-full bottom-0 mr-4 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 p-4 w-[360px] z-50 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
                    >
                      {/* Category Tabs - Icons only */}
                      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar shrink-0 justify-around">
                        {SHAPE_CATEGORIES.map((cat) => {
                          const isSelected = selectedCategoryTab === cat.id;
                          const categoryIcons: Record<string, React.ReactNode> = {
                            geometry: <Shapes className="w-5 h-5 text-purple-500 shrink-0" />,
                            symbols: <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />,
                            nature: <Sun className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0" />,
                            vehicles: <Car className="w-5 h-5 text-sky-500 shrink-0" />,
                            objects: <Lightbulb className="w-5 h-5 text-yellow-500 fill-yellow-400 shrink-0" />,
                          };
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategoryTab(cat.id)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-105 shadow-sm'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title={cat.title}
                            >
                              {categoryIcons[cat.id]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Shapes Grid - Icons only without text labels */}
                      <div className="grid grid-cols-4 gap-2.5 py-1 justify-items-center">
                        {SHAPE_CATEGORIES.find((c) => c.id === selectedCategoryTab)?.shapes.map((shape) => (
                          <button
                            key={shape.id}
                            onClick={() => {
                              setActiveTool('custom');
                              setActiveCustomShapeData(shape.path);
                              setIsShapesPopoverOpen(false);
                            }}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center p-2 transition-all border-2 ${
                              activeTool === 'custom' && activeCustomShapeData === shape.path
                                ? 'border-indigo-500 bg-indigo-100 scale-105 shadow-sm'
                                : 'border-slate-100 bg-slate-50/80 hover:bg-indigo-50 hover:border-indigo-200 hover:scale-105'
                            }`}
                            title={shape.name}
                          >
                            <svg viewBox="0 0 100 100" className="w-8 h-8 text-slate-700 fill-current">
                              <path d={shape.path} />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Color swatches & Cute mascot Splat */}
          <div className="p-4 bg-white border-t-2 border-[#e5dfd3] flex items-center justify-between shrink-0 relative z-20">
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Stroke vs Fill vs Transparent Selector - Icons only */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setColorTarget('stroke');
                    if (activeTool === 'fill') setActiveTool('select');
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    colorTarget === 'stroke'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Line Color"
                >
                  <Pencil className="w-5 h-5 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setColorTarget('fill');
                    setActiveTool('fill');
                  }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    colorTarget === 'fill'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Fill Color"
                >
                  <PaintBucketIcon className="w-6 h-6" color={selectedColor === 'transparent' ? '#f59e0b' : selectedColor} />
                </button>

                {colorTarget === 'fill' && (
                  <button
                    type="button"
                    onClick={() => handleColorSelect('transparent')}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${
                      selectedColor === 'transparent'
                        ? 'bg-red-50 text-red-600 border-red-400 ring-2 ring-red-400 scale-105'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Transparent Fill (No Fill)"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-slate-400 relative overflow-hidden flex items-center justify-center bg-white">
                      <div className="absolute w-full h-[2px] bg-red-500 rotate-45" />
                    </div>
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PALETTE_COLORS_ROW1.map((color) => (
                  <button
                    key={`paint-r1-${color}`}
                    onClick={() => handleColorSelect(color)}
                    className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all relative ${
                      selectedColor === color ? 'scale-110 ring-2 ring-amber-400 border-white shadow-md' : 'border-slate-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {PALETTE_COLORS_ROW2.map((color) => (
                  <button
                    key={`paint-r2-${color}`}
                    onClick={() => handleColorSelect(color)}
                    className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all relative ${
                      selectedColor === color ? 'scale-110 ring-2 ring-amber-400 border-white shadow-md' : 'border-slate-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Mascot Splat */}
            <div className="w-20 h-20 mr-4 flex items-center justify-center relative select-none">
              <svg className="w-16 h-16 transition-all filter drop-shadow-md" viewBox="0 0 100 100">
                <path 
                  d="M50 15 C60 12, 75 8, 80 20 C85 30, 95 45, 90 60 C85 75, 70 90, 50 85 C30 90, 15 80, 10 65 C5 50, 8 35, 18 25 C28 15, 40 18, 50 15 Z" 
                  fill={selectedColor} 
                  className="transition-colors duration-200"
                />
                <circle cx="42" cy="45" r="7" fill="white" />
                <circle cx="42" cy="45" r="3.5" fill="black" />
                <circle cx="42" cy="43" r="1.5" fill="white" />
                
                <circle cx="58" cy="45" r="7" fill="white" />
                <circle cx="58" cy="45" r="3.5" fill="black" />
                <circle cx="58" cy="43" r="1.5" fill="white" />
                <path d="M46 56 Q50 60 54 56" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Camera popup */}
          <AnimatePresence>
            {isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-amber-400 flex flex-col items-center">
                  <h3 className="text-lg font-black text-slate-800 mb-4">Smile for the camera! 📸</h3>
                  <div className="w-64 h-48 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-300 relative mb-4 flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="absolute w-full h-full object-cover scale-x-[-1] transition-all duration-300" 
                      style={{ 
                        clipPath: cameraShape === 'circle' ? 'circle(50% at 50% 50%)' :
                                  cameraShape === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' :
                                  cameraShape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' :
                                  'none'
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => setCameraShape('rect')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'rect' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="Rectangle"
                    >
                      <div className="w-6 h-6 border-2 border-slate-600 rounded-sm"></div>
                    </button>
                    <button 
                      onClick={() => setCameraShape('circle')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'circle' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="Circle"
                    >
                      <div className="w-6 h-6 border-2 border-slate-600 rounded-full"></div>
                    </button>
                    <button 
                      onClick={() => setCameraShape('triangle')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'triangle' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="Triangle"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                        <path d="M12 2l10 20H2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setCameraShape('star')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'star' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="Star"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={capturePhoto}
                      className="flex-1 py-3 bg-[#7CB342] text-white font-extrabold rounded-2xl shadow-md hover:bg-[#689F38] active:scale-95 transition-all border-b-4 border-[#558B2F]"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCameraStream}
                      className="flex-1 py-3 bg-red-500 text-white font-extrabold rounded-2xl shadow-md hover:bg-red-600 active:scale-95 transition-all border-b-4 border-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          <style>{`
            .paint-checkerboard {
              background-color: #ffffff;
              background-image: 
                linear-gradient(45deg, #fbfbfb 25%, transparent 25%), 
                linear-gradient(-45deg, #fbfbfb 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #fbfbfb 75%), 
                linear-gradient(-45deg, transparent 75%, #fbfbfb 75%);
              background-size: 20px 20px;
              background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            }
          `}</style>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

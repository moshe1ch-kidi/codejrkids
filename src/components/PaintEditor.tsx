 import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Undo, Redo, Camera, Check, ArrowUpRight, 
  RotateCw, Copy, Scissors, PaintBucket,
  Brush, Circle, Square, Triangle, Shapes
} from 'lucide-react';
import { SHAPE_ROWS } from '../lib/shapes';

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: 'brush' | 'circle' | 'rect' | 'triangle' | 'image' | 'custom';
  color: string;
  width: number;
  points: Point[];
  fillColor?: string;
  imgUrl?: string;
  pathData?: string;
}

type ToolType = 'brush' | 'circle' | 'rect' | 'triangle' | 'select' | 'rotate' | 'stamp' | 'scissors' | 'camera' | 'fill' | 'custom';

export interface PaintEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, dataUrl: string, shapes?: Shape[]) => void;
  initialName?: string;
  initialShapes?: Shape[];
  initialSpriteUrl?: string;
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

      let points: Point[] = [];

      if (tagName === 'path') {
        const pathEl = el as SVGPathElement;
        const totalLength = pathEl.getTotalLength();
        if (totalLength > 0) {
          const step = Math.max(2, Math.min(10, totalLength / 40));
          for (let d = 0; d <= totalLength; d += step) {
            const pt = pathEl.getPointAtLength(d);
            const transformed = transformPoint(pt.x, pt.y);
            points.push({
              x: transformed.x * scale + offsetX,
              y: transformed.y * scale + offsetY
            });
          }
          const pt = pathEl.getPointAtLength(totalLength);
          const transformed = transformPoint(pt.x, pt.y);
          if (points.length === 0 || Math.hypot(points[points.length - 1].x - (transformed.x * scale + offsetX), points[points.length - 1].y - (transformed.y * scale + offsetY)) > 1) {
            points.push({
              x: transformed.x * scale + offsetX,
              y: transformed.y * scale + offsetY
            });
          }
        }
      } else if (tagName === 'rect') {
        const rx = parseFloat(el.getAttribute('x') || '0');
        const ry = parseFloat(el.getAttribute('y') || '0');
        const rw = parseFloat(el.getAttribute('width') || '0');
        const rh = parseFloat(el.getAttribute('height') || '0');
        const pts = [
          { x: rx, y: ry },
          { x: rx + rw, y: ry },
          { x: rx + rw, y: ry + rh },
          { x: rx, y: ry + rh },
          { x: rx, y: ry }
        ];
        points = pts.map(p => {
          const transformed = transformPoint(p.x, p.y);
          return {
            x: transformed.x * scale + offsetX,
            y: transformed.y * scale + offsetY
          };
        });
      } else if (tagName === 'circle') {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const r = parseFloat(el.getAttribute('r') || '0');
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const transformed = transformPoint(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          points.push({
            x: transformed.x * scale + offsetX,
            y: transformed.y * scale + offsetY
          });
        }
      } else if (tagName === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const rx = parseFloat(el.getAttribute('rx') || '0');
        const ry = parseFloat(el.getAttribute('ry') || '0');
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const transformed = transformPoint(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
          points.push({
            x: transformed.x * scale + offsetX,
            y: transformed.y * scale + offsetY
          });
        }
      } else if (tagName === 'polygon' || tagName === 'polyline') {
        const pointsAttr = el.getAttribute('points') || '';
        const coords = pointsAttr.trim().split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));
        const pts: Point[] = [];
        for (let i = 0; i < coords.length; i += 2) {
          if (coords[i] !== undefined && coords[i+1] !== undefined) {
            pts.push({ x: coords[i], y: coords[i+1] });
          }
        }
        if (tagName === 'polygon' && pts.length > 0) {
          pts.push({ ...pts[0] });
        }
        points = pts.map(p => {
          const transformed = transformPoint(p.x, p.y);
          return {
            x: transformed.x * scale + offsetX,
            y: transformed.y * scale + offsetY
          };
        });
      }

      if (points.length > 0) {
        parsedShapes.push({
          id: `svg-shape-${index}-${Date.now()}`,
          type: 'brush',
          color: strokeColor === 'transparent' ? (fillColor !== 'transparent' ? fillColor : '#000000') : strokeColor,
          width: strokeWidth,
          points,
          fillColor: fillColor
        });
      }
    });

    document.body.removeChild(tempContainer);
    return parsedShapes;
  } catch (err) {
    console.error('Error parsing SVG:', err);
    return [];
  }
}

export function PaintEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  initialName, 
  initialShapes, 
  initialSpriteUrl 
}: PaintEditorProps) {
  const [characterName, setCharacterName] = useState('דמות');
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [activeCustomShapeData, setActiveCustomShapeData] = useState<string>('');
  const [isShapesPopoverOpen, setIsShapesPopoverOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(8);
  
  // Vector shape state list
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Undo / Redo history stack of vector frames
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing / Interaction states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isReshaping, setIsReshaping] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [draggedShapeStartPoints, setDraggedShapeStartPoints] = useState<Point[]>([]);
  const [brushScalingStartBox, setBrushScalingStartBox] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);

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
      setCharacterName(initialName || 'דמות');
      setActiveTool('brush');
      setSelectedColor('#000000');
      setBrushWidth(8);
      setSelectedShapeId(null);

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
          if (initialSpriteUrl.toLowerCase().endsWith('.svg')) {
            try {
              const res = await fetch(initialSpriteUrl);
              const text = await res.text();
              const parsed = await parseSvgTextToShapes(text);
              if (parsed && parsed.length > 0) {
                setShapes(parsed);
                setHistory([parsed]);
                setHistoryIndex(0);
                return;
              }
            } catch (err) {
              console.error("Failed to parse SVG, falling back to raster load", err);
            }
          }

          const newId = `shape-init-${Date.now()}`;
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = initialSpriteUrl;
            img.onload = () => {
              loadedImages.current[newId] = img;
              resolve();
            };
            img.onerror = () => {
              resolve();
            };
          });

          const initImgShape: Shape = {
            id: newId,
            type: 'image',
            color: '#000000',
            width: 2,
            points: [
              { x: 50, y: 50 },
              { x: 400, y: 50 },
              { x: 400, y: 400 },
              { x: 50, y: 400 }
            ],
            imgUrl: initialSpriteUrl
          };
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
  }, [isOpen, initialName, initialShapes, initialSpriteUrl]);

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
      setSelectedShapeId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setShapes(history[nextIndex]);
      setHistoryIndex(nextIndex);
      setSelectedShapeId(null);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedShapeId) {
      const updated = shapes.map(s => {
        if (s.id === selectedShapeId) {
          return { ...s, color: color };
        }
        return s;
      });
      saveStateToHistory(updated);
    }
  };

  const handleBrushWidthSelect = (width: number) => {
    setBrushWidth(width);
    if (selectedShapeId) {
      const updated = shapes.map(s => {
        if (s.id === selectedShapeId) {
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

      if ((shape.type === 'circle' || shape.type === 'custom') && shape.points.length >= 4) {
        const cx = (shape.points[1].x + shape.points[3].x) / 2;
        const cy = (shape.points[0].y + shape.points[2].y) / 2;
        const rx = Math.abs(shape.points[1].x - shape.points[3].x) / 2;
        const ry = Math.abs(shape.points[2].y - shape.points[0].y) / 2;
        const dx = x - cx;
        const dy = y - cy;
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
          if (distToSegment({ x, y }, p1, p2) < 15) {
            return shape;
          }
        }
      } else if (shape.type === 'brush') {
        for (let j = 0; j < shape.points.length - 1; j++) {
          if (distToSegment({ x, y }, shape.points[j], shape.points[j + 1]) < 18) {
            return shape;
          }
        }
      } else if (shape.type === 'image' && shape.points.length >= 4) {
        const minX = Math.min(...shape.points.map(p => p.x));
        const maxX = Math.max(...shape.points.map(p => p.x));
        const minY = Math.min(...shape.points.map(p => p.y));
        const maxY = Math.max(...shape.points.map(p => p.y));
        if (x >= minX - 15 && x <= maxX + 15 && y >= minY - 15 && y <= maxY + 15) {
          return shape;
        }
      }
    }
    return null;
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
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          ctx.stroke();
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
          ctx.stroke();
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
          ctx.stroke();
        }
      } else if (shape.type === 'circle') {
        if (shape.points.length >= 4) {
          const cx = (shape.points[1].x + shape.points[3].x) / 2;
          const cy = (shape.points[0].y + shape.points[2].y) / 2;
          const rx = Math.abs(shape.points[1].x - shape.points[3].x) / 2;
          const ry = Math.abs(shape.points[2].y - shape.points[0].y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill();
          }
          ctx.stroke();
        }
      } else if (shape.type === 'custom' && shape.pathData) {
        if (shape.points.length >= 4) {
          const cx = (shape.points[1].x + shape.points[3].x) / 2;
          const cy = (shape.points[0].y + shape.points[2].y) / 2;
          const rx = Math.abs(shape.points[1].x - shape.points[3].x) / 2;
          const ry = Math.abs(shape.points[2].y - shape.points[0].y) / 2;
          
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale((rx * 2) / 100, (ry * 2) / 100);
          ctx.translate(-50, -50);
          
          const path2d = new Path2D(shape.pathData);
          if (shape.fillColor && shape.fillColor !== 'transparent') {
            ctx.fillStyle = shape.fillColor;
            ctx.fill(path2d);
          }
          // Reset scale for stroke so it doesn't get distorted
          ctx.lineWidth = shape.width / Math.max((rx * 2) / 100, (ry * 2) / 100);
          ctx.stroke(path2d);
          ctx.restore();
        }
      } else if (shape.type === 'image') {
        if (shape.points.length >= 4) {
          const minX = Math.min(...shape.points.map(p => p.x));
          const maxX = Math.max(...shape.points.map(p => p.x));
          const minY = Math.min(...shape.points.map(p => p.y));
          const maxY = Math.max(...shape.points.map(p => p.y));
          const img = loadedImages.current[shape.id];
          if (img) {
            ctx.drawImage(img, minX, minY, maxX - minX, maxY - minY);
          } else {
            const newImg = new Image();
            newImg.src = shape.imgUrl || '';
            newImg.onload = () => {
              loadedImages.current[shape.id] = newImg;
              renderAllShapes(ctx, width, height, drawHandles);
            };
          }
        }
      }
      ctx.restore();
    });

    // Draw circular control points & dashes for selected shape
    if (drawHandles && activeTool === 'select' && selectedShapeId) {
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      if (selectedShape) {
        let handlePoints: Point[] = [];
        if (selectedShape.type === 'brush') {
          const box = getBrushBoundingBox(selectedShape.points);
          handlePoints = [
            { x: box.minX, y: box.minY },
            { x: box.maxX, y: box.minY },
            { x: box.maxX, y: box.maxY },
            { x: box.minX, y: box.maxY },
          ];
          ctx.save();
          ctx.strokeStyle = '#29b6f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
          ctx.restore();
        } else {
          handlePoints = selectedShape.points;
          ctx.save();
          ctx.strokeStyle = '#29b6f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(handlePoints[0].x, handlePoints[0].y);
          for (let i = 1; i < handlePoints.length; i++) {
            ctx.lineTo(handlePoints[i].x, handlePoints[i].y);
          }
          if (selectedShape.type !== 'brush') {
            ctx.closePath();
          }
          ctx.stroke();
          ctx.restore();
        }

        handlePoints.forEach((pt) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0288d1';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderAllShapes(ctx, canvas.width, canvas.height, true);
  }, [shapes, selectedShapeId, activeTool]);

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
      if (clickedShape) {
        const updated = shapes.map(s => {
          if (s.id === clickedShape.id) {
            return { ...s, fillColor: selectedColor };
          }
          return s;
        });
        saveStateToHistory(updated);
      }
      return;
    }

    if (activeTool === 'scissors') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        const updated = shapes.filter(s => s.id !== clickedShape.id);
        saveStateToHistory(updated);
        setSelectedShapeId(null);
      }
      return;
    }

    if (activeTool === 'stamp') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        const newId = `shape-${Date.now()}`;
        const duplicated: Shape = {
          ...clickedShape,
          id: newId,
          points: clickedShape.points.map(p => ({ x: p.x + 25, y: p.y + 25 }))
        };
        saveStateToHistory([...shapes, duplicated]);
        setSelectedShapeId(newId);
      }
      return;
    }

    if (activeTool === 'rotate') {
      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        const centroid = getCentroid(clickedShape.points);
        const updated = shapes.map(s => {
          if (s.id === clickedShape.id) {
            return {
              ...s,
              points: s.points.map(p => rotatePoint(p, centroid, Math.PI / 2))
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
      if (selectedShapeId) {
        const selectedShape = shapes.find(s => s.id === selectedShapeId);
        if (selectedShape) {
          let handlePoints = selectedShape.points;
          if (selectedShape.type === 'brush') {
            const box = getBrushBoundingBox(selectedShape.points);
            handlePoints = [
              { x: box.minX, y: box.minY },
              { x: box.maxX, y: box.minY },
              { x: box.maxX, y: box.maxY },
              { x: box.minX, y: box.maxY },
            ];
            setBrushScalingStartBox(box);
          }

          const clickedHandleIdx = handlePoints.findIndex(pt => Math.hypot(pt.x - x, pt.y - y) < 14);
          if (clickedHandleIdx !== -1) {
            setIsReshaping(true);
            setSelectedPointIndex(clickedHandleIdx);
            setDragStartPos(currentPoint);
            return;
          }
        }
      }

      const clickedShape = findShapeAtPosition(x, y);
      if (clickedShape) {
        setSelectedShapeId(clickedShape.id);
        setIsDraggingShape(true);
        setDragStartPos(currentPoint);
        setDraggedShapeStartPoints(clickedShape.points.map(p => ({ ...p })));
      } else {
        setSelectedShapeId(null);
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
    }

    if (newShape) {
      setShapes([...shapes, newShape]);
      setSelectedShapeId(newId);
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
      if (isReshaping && selectedShapeId && selectedPointIndex !== null) {
        setShapes(prev => prev.map(shape => {
          if (shape.id !== selectedShapeId) return shape;

          if (shape.type === 'brush' && brushScalingStartBox) {
            const box = brushScalingStartBox;
            const w = box.maxX - box.minX;
            const h = box.maxY - box.minY;
            if (w === 0 || h === 0) return shape;

            let newMinX = box.minX, newMaxX = box.maxX, newMinY = box.minY, newMaxY = box.maxY;
            if (selectedPointIndex === 0) {
              newMinX = x; newMinY = y;
            } else if (selectedPointIndex === 1) {
              newMaxX = x; newMinY = y;
            } else if (selectedPointIndex === 2) {
              newMaxX = x; newMaxY = y;
            } else if (selectedPointIndex === 3) {
              newMinX = x; newMaxY = y;
            }

            const newW = newMaxX - newMinX;
            const newH = newMaxY - newMinY;

            return {
              ...shape,
              points: shape.points.map(p => {
                const u = (p.x - box.minX) / w;
                const v = (p.y - box.minY) / h;
                return { x: newMinX + u * newW, y: newMinY + v * newH };
              })
            };
          }

          const updatedPoints = [...shape.points];
          if (shape.type === 'circle' || shape.type === 'custom') {
            const cx = (updatedPoints[1].x + updatedPoints[3].x) / 2;
            const cy = (updatedPoints[0].y + updatedPoints[2].y) / 2;
            if (selectedPointIndex === 0 || selectedPointIndex === 2) {
              const ry = Math.abs(y - cy);
              updatedPoints[0].y = cy - ry;
              updatedPoints[2].y = cy + ry;
            } else if (selectedPointIndex === 1 || selectedPointIndex === 3) {
              const rx = Math.abs(x - cx);
              updatedPoints[1].x = cx + rx;
              updatedPoints[3].x = cx - rx;
            }
          } else {
            updatedPoints[selectedPointIndex] = currentPoint;
          }

          return { ...shape, points: updatedPoints };
        }));
      } else if (isDraggingShape && selectedShapeId) {
        const dx = x - dragStartPos.x;
        const dy = y - dragStartPos.y;
        setShapes(prev => prev.map(shape => {
          if (shape.id !== selectedShapeId) return shape;
          return {
            ...shape,
            points: draggedShapeStartPoints.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }));
      }
      return;
    }

    if (!isDrawing) return;

    setShapes(prev => prev.map(shape => {
      if (shape.id !== selectedShapeId) return shape;

      if (shape.type === 'brush') {
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
    if (isDrawing || isReshaping || isDraggingShape) {
      setIsDrawing(false);
      setIsReshaping(false);
      setIsDraggingShape(false);
      setSelectedPointIndex(null);
      setBrushScalingStartBox(null);
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
      alert("לא ניתן לגשת למצלמה.");
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
    const hw = 60, hh = 60;

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
    setSelectedShapeId(newId);
    stopCameraStream();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Export clean PNG without visual handles
    renderAllShapes(ctx, canvas.width, canvas.height, false);
    const dataUrl = trimCanvas(canvas);
    
    // Restore visual handles
    renderAllShapes(ctx, canvas.width, canvas.height, true);
    onSave(characterName || 'דמות', dataUrl, shapes);
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
          dir="rtl"
        >
          {/* Top Bar */}
          <div className="h-16 px-6 flex justify-between items-center shrink-0 border-b-2 border-[#e5dfd3] relative z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] disabled:bg-[#b0cde4] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="ביטול"
              >
                <Undo className="w-5 h-5 stroke-[3]" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] disabled:bg-[#b0cde4] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
                title="שחזור"
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
                placeholder="שם דמות"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-12 h-12 rounded-full bg-[#78b7e7] hover:bg-[#61a7e2] text-white flex items-center justify-center shadow-md active:scale-95 transition-all border-2 border-white"
              title="שמירה"
            >
              <Check className="w-6 h-6 stroke-[3.5]" />
            </button>
          </div>

          {/* Central Workspace Panel */}
          <div className="flex-1 flex min-h-0 relative p-4 gap-4 items-stretch">
            
            {/* Draw Tools Panel */}
            <div className="w-20 sm:w-24 shrink-0 flex flex-col items-center justify-between py-2">
              <div className="flex flex-col gap-3.5 w-full items-center">
                <button
                  onClick={() => setActiveTool('brush')}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    activeTool === 'brush' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="ציור חופשי"
                >
                  <Brush className="w-7 h-7 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => setActiveTool('circle')}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    activeTool === 'circle' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="עיגול"
                >
                  <Circle className="w-7 h-7 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => setActiveTool('rect')}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    activeTool === 'rect' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="מלבן"
                >
                  <Square className="w-7 h-7 text-slate-700 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => setActiveTool('triangle')}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    activeTool === 'triangle' ? 'bg-amber-100 scale-105 border-2 border-amber-400' : 'hover:bg-slate-200/50'
                  }`}
                  title="משולש"
                >
                  <Triangle className="w-7 h-7 text-slate-700 stroke-[2.5]" />
                </button>
              </div>

              {/* Stroke width selectors */}
              <div className="flex flex-col gap-3 w-full items-center pt-4 border-t border-[#e2dac6]">
                {[4, 8, 14, 22].map((width) => {
                  const isActive = brushWidth === width;
                  return (
                    <button
                      key={width}
                      onClick={() => handleBrushWidthSelect(width)}
                      className="w-14 h-8 relative flex items-center justify-center transition-all"
                    >
                      {isActive && (
                        <svg className="absolute inset-0 w-full h-full text-amber-500 fill-none" viewBox="0 0 60 30">
                          <ellipse cx="30" cy="15" rx="27" ry="12" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
                        </svg>
                      )}
                      <div className="bg-slate-800 rounded-full" style={{ width: '32px', height: `${Math.max(2, width * 0.7)}px` }} />
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
                  onPointerLeave={stopDrawing}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
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
                title="בחירה והזזה"
              >
                <ArrowUpRight className="w-6 h-6 stroke-[3] -rotate-45" />
              </button>

              <button
                onClick={() => setActiveTool('rotate')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'rotate' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="סיבוב"
              >
                <RotateCw className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setActiveTool('stamp')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'stamp' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="חותמת שכפול"
              >
                <Copy className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setActiveTool('scissors')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'scissors' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="מחיקה וגזירה"
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
                title="מצלמה"
              >
                <Camera className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setActiveTool('fill')}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                  activeTool === 'fill' ? '!bg-[#D84315] text-white border-[#9E2A2B] scale-105' : 'hover:bg-slate-50 text-slate-700'
                }`}
                title="דלי צבע"
              >
                <PaintBucket className="w-6 h-6 stroke-[2.5]" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsShapesPopoverOpen(!isShapesPopoverOpen)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white border-b-4 border-slate-300 shadow-sm active:translate-y-[2px] active:border-b-2 ${
                    activeTool === 'custom' || isShapesPopoverOpen ? '!bg-indigo-500 text-white border-indigo-700 scale-105' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  title="צורות מיוחדות"
                >
                  <Shapes className="w-6 h-6 stroke-[2.5]" />
                </button>

                <AnimatePresence>
                  {isShapesPopoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: -20 }}
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 p-4 w-max max-w-[80vw] overflow-x-auto z-50 flex flex-col gap-3"
                    >
                      {SHAPE_ROWS.map((row, rowIdx) => (
                        <div key={rowIdx} className="flex gap-2 justify-center">
                          {row.map(shape => (
                            <button
                              key={shape.id}
                              onClick={() => {
                                setActiveTool('custom');
                                setActiveCustomShapeData(shape.path);
                                setIsShapesPopoverOpen(false);
                              }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-50 transition-colors border-2 ${
                                activeTool === 'custom' && activeCustomShapeData === shape.path ? 'border-indigo-400 bg-indigo-50' : 'border-transparent'
                              }`}
                              title={shape.name}
                            >
                              <svg viewBox="0 0 100 100" className="w-6 h-6 text-slate-700 fill-current">
                                <path d={shape.path} />
                              </svg>
                            </button>
                          ))}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Color swatches & Cute mascot Splat */}
          <div className="p-4 bg-white border-t-2 border-[#e5dfd3] flex items-center justify-between shrink-0 relative z-20">
            <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
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
                  <h3 className="text-lg font-black text-slate-800 mb-4">חייך למצלמה! 📸</h3>
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
                      title="מלבן"
                    >
                      <div className="w-6 h-6 border-2 border-slate-600 rounded-sm"></div>
                    </button>
                    <button 
                      onClick={() => setCameraShape('circle')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'circle' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="עיגול"
                    >
                      <div className="w-6 h-6 border-2 border-slate-600 rounded-full"></div>
                    </button>
                    <button 
                      onClick={() => setCameraShape('triangle')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'triangle' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="משולש"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                        <path d="M12 2l10 20H2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setCameraShape('star')}
                      className={`p-2 rounded-xl transition-all ${cameraShape === 'star' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent'}`}
                      title="כוכב"
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
                      צלם תמונה
                    </button>
                    <button
                      onClick={stopCameraStream}
                      className="flex-1 py-3 bg-red-500 text-white font-extrabold rounded-2xl shadow-md hover:bg-red-600 active:scale-95 transition-all border-b-4 border-red-700"
                    >
                      ביטול
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

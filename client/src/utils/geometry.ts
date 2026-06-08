import type { Point, Rect, CardEdge, Evidence } from '@/types';

export function getCardEdges(card: Evidence): CardEdge {
  const { positionX, positionY, width, height } = card;
  const centerX = positionX + width / 2;
  const centerY = positionY + height / 2;

  return {
    top: { x: centerX, y: positionY },
    right: { x: positionX + width, y: centerY },
    bottom: { x: centerX, y: positionY + height },
    left: { x: positionX, y: centerY },
  };
}

export function getNearestEdge(fromCard: Evidence, toCard: Evidence): { from: Point; to: Point } {
  const fromEdges = getCardEdges(fromCard);
  const toEdges = getCardEdges(toCard);

  const edges: Array<{ from: Point; to: Point; distance: number }> = [];

  (Object.keys(fromEdges) as Array<keyof CardEdge>).forEach((fromKey) => {
    (Object.keys(toEdges) as Array<keyof CardEdge>).forEach((toKey) => {
      const from = fromEdges[fromKey];
      const to = toEdges[toKey];
      const distance = getDistance(from, to);
      edges.push({ from, to, distance });
    });
  });

  edges.sort((a, b) => a.distance - b.distance);
  return { from: edges[0].from, to: edges[0].to };
}

export function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function getCardCenter(card: Evidence): Point {
  return {
    x: card.positionX + card.width / 2,
    y: card.positionY + card.height / 2,
  };
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getLineMidpoint(from: Point, to: Point): Point {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
}

export function getLinePath(from: Point, to: Point, curveOffset: number = 50): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const perpX = -dy / length;
  const perpY = dx / length;

  const offset = Math.min(curveOffset, length / 3);
  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

export function getGridAlignedPosition(x: number, y: number, gridSize: number = 20): Point {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpPoint(p1: Point, p2: Point, t: number): Point {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function getBoundingBox(points: Point[]): Rect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

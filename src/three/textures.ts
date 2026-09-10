import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

import type { ResourceRegistry } from './resource-registry';

/**
 * Текстура свечения генерируется в рантайме, а не грузится файлом:
 * ноль сетевых запросов и ноль байт в бандле (§5.1 — бюджет загрузки).
 */
export function createGlowTexture(registry: ResourceRegistry, size = 128): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D-контекст недоступен: не удалось построить текстуру свечения');
  }

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  // Резкое ядро и длинный мягкий хвост — иначе свечение выглядит плоским кругом.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return registry.track(texture);
}

/**
 * Текстура расфокусированного пятна (боке).
 *
 * В отличие от свечения здесь нет яркого ядра: у объектива вне фокуса точка
 * превращается в диск почти ровной яркости со слегка подчёркнутым краем.
 * Именно это и даёт ощущение размытия без единого прохода постобработки —
 * настоящий depth of field стоил бы бюджета кадра (§5.3).
 */
export function createBokehTexture(registry: ResourceRegistry, size = 256): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D-контекст недоступен: не удалось построить текстуру боке');
  }

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.4)');
  // Подсвеченный ободок — характерная черта боке.
  gradient.addColorStop(0.82, 'rgba(255,255,255,0.62)');
  gradient.addColorStop(0.93, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return registry.track(texture);
}

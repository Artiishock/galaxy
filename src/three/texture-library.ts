import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

import type { ResourceRegistry } from './resource-registry';

/**
 * Загрузка текстур с правильным цветовым пространством (§5.2).
 *
 * Разделение на `color` и `data` — не украшательство: базовый цвет хранится в
 * sRGB и должен быть линеаризован перед освещением, а шероховатость,
 * металличность и нормали — это числа, а не цвет, и любая гамма-коррекция их
 * испортит. Ошибка тихая: картинка просто выглядит блёклой или пережжённой.
 *
 * `TextureLoader.load` возвращает объект текстуры сразу и дозаполняет его, когда
 * придёт файл, — поэтому материал можно собрать синхронно, без ожидания сети.
 */
export class TextureLibrary {
  readonly #loader = new TextureLoader();
  readonly #registry: ResourceRegistry;
  readonly #anisotropy: number;
  readonly #cache = new Map<string, Texture>();

  constructor(registry: ResourceRegistry, maxAnisotropy: number) {
    this.#registry = registry;
    // Сферы смотрят на камеру под скользящими углами у краёв — без анизотропной
    // фильтрации текстура там превращается в кашу.
    this.#anisotropy = Math.min(maxAnisotropy, 8);
  }

  /** Базовый цвет: пиксели — это цвет, поэтому sRGB. */
  color(url: string): Texture {
    return this.#load(url, true);
  }

  /** Нормали, шероховатость, металличность: числа, остаются линейными. */
  data(url: string): Texture {
    return this.#load(url, false);
  }

  #load(url: string, srgb: boolean): Texture {
    const cached = this.#cache.get(url);
    if (cached) {
      return cached;
    }

    const texture = this.#loader.load(url);
    if (srgb) {
      texture.colorSpace = SRGBColorSpace;
    }
    texture.anisotropy = this.#anisotropy;

    this.#cache.set(url, texture);
    return this.#registry.track(texture);
  }
}

/**
 * TextureCache - Manages seat texture creation and caching
 * Optimizes rendering by reusing textures for seats with identical appearance
 */

import * as PIXI from 'pixi.js';

export class TextureCache {
    /**
     * @param {PIXI.Renderer} renderer - The PIXI renderer for texture generation
     * @param {Object} options - Configuration options
     * @param {number} options.resolution - Texture resolution multiplier (default: 4)
     */
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.options = {
            resolution: 4,
            ...options
        };
        this.cache = {};
    }

    /**
     * Create or retrieve a cached texture for a seat
     * @param {number} radius - Seat radius
     * @param {number} color - Fill color
     * @param {number} strokeWidth - Stroke width (0 for no stroke)
     * @param {number} strokeColor - Stroke color
     * @returns {PIXI.Texture}
     */
    getSeatTexture(radius, color, strokeWidth, strokeColor) {
        const resolution = this.options.resolution;
        const key = `seat-${radius}-${color}-${strokeWidth}-${strokeColor}-res${resolution}`;
        
        if (this.cache[key]) {
            return this.cache[key];
        }

        const scaledRadius = radius * resolution;
        const scaledStroke = strokeWidth * resolution;

        const gr = new PIXI.Graphics();
        gr.circle(0, 0, scaledRadius);
        gr.fill({ color: color });
        
        if (strokeWidth > 0) {
            gr.stroke({ width: scaledStroke, color: strokeColor });
        }

        const texture = this.renderer.generateTexture(gr);
        this.cache[key] = texture;
        
        return texture;
    }

    /**
     * Check if a texture exists in cache
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return !!this.cache[key];
    }

    /**
     * Get a texture by key
     * @param {string} key - Cache key
     * @returns {PIXI.Texture|undefined}
     */
    get(key) {
        return this.cache[key];
    }

    /**
     * Store a texture with custom key
     * @param {string} key - Cache key
     * @param {PIXI.Texture} texture - Texture to store
     */
    set(key, texture) {
        this.cache[key] = texture;
    }

    /**
     * Clear all cached textures
     */
    clear() {
        Object.values(this.cache).forEach(texture => {
            if (texture && texture.destroy) {
                texture.destroy(true);
            }
        });
        this.cache = {};
    }

    /**
     * Destroy the cache and cleanup resources
     */
    destroy() {
        this.clear();
        this.renderer = null;
    }

    /**
     * Get the number of cached textures
     * @returns {number}
     */
    get size() {
        return Object.keys(this.cache).length;
    }
}

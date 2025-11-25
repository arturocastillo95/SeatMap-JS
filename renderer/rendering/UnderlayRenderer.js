/**
 * UnderlayRenderer - Handles underlay/background image rendering
 */

import * as PIXI from 'pixi.js';

/**
 * Render the underlay image
 * @param {PIXI.Container} viewport - The viewport container
 * @param {Object} underlayData - Underlay configuration
 * @returns {Promise<PIXI.Sprite|null>}
 */
export async function renderUnderlay(viewport, underlayData) {
    if (!underlayData.dataUrl && !underlayData.sourceUrl) {
        return null;
    }

    try {
        const urlToLoad = underlayData.sourceUrl || underlayData.dataUrl;
        const texture = await PIXI.Assets.load(urlToLoad);
        const sprite = new PIXI.Sprite(texture);
        
        sprite.x = underlayData.x || 0;
        sprite.y = underlayData.y || 0;
        sprite.alpha = underlayData.opacity !== undefined ? underlayData.opacity : 1;
        
        const scale = underlayData.scale !== undefined ? underlayData.scale : 1;
        sprite.scale.set(scale);

        viewport.addChild(sprite);
        return sprite;
    } catch (e) {
        console.error("Failed to load underlay image", e);
        return null;
    }
}

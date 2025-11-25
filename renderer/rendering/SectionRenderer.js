/**
 * SectionRenderer - Handles section container creation and rendering
 */

import * as PIXI from 'pixi.js';

/**
 * Render GA (General Admission) content
 * @param {PIXI.Container} container - Section container
 * @param {Object} data - Section data
 * @param {number} width - Section width
 * @param {number} height - Section height
 * @param {PIXI.Container} labelsLayer - Labels layer for global labels
 */
export function renderGAContent(container, data, width, height, labelsLayer) {
    const text = new PIXI.Text({
        text: data.name || "GA",
        style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 18,
            fontWeight: 'bold',
            fill: 0xffffff,
            align: 'center'
        }
    });
    text.anchor.set(0.5);
    text.eventMode = 'none';

    if (labelsLayer) {
        text.x = container.x;
        text.y = container.y;
        text.rotation = container.rotation;
        labelsLayer.addChild(text);
    } else {
        text.x = width / 2;
        text.y = height / 2;
        container.addChild(text);
    }

    container.zoneLabel = text;

    // Capacity
    if (data.ga && data.ga.capacity) {
        const capText = new PIXI.Text({
            text: `Capacity: ${data.ga.capacity}`,
            style: {
                fontFamily: 'system-ui, sans-serif',
                fontSize: 12,
                fill: 0xcccccc,
                align: 'center'
            }
        });
        capText.anchor.set(0.5);
        capText.eventMode = 'none';
        
        if (labelsLayer) {
            capText.x = 0;
            capText.y = 20;
            text.addChild(capText);
        } else {
            capText.x = width / 2;
            capText.y = height / 2 + 20;
            container.addChild(capText);
        }
    }
}

/**
 * Render Zone content
 * @param {PIXI.Container} container - Section container
 * @param {Object} data - Section data
 * @param {number} width - Section width
 * @param {number} height - Section height
 * @param {PIXI.Container} labelsLayer - Labels layer for global labels
 */
export function renderZoneContent(container, data, width, height, labelsLayer) {
    const fontSize = data.labelFontSize || 16;
    const fontColor = data.labelColor !== undefined ? data.labelColor : 0x333333;
    const offsetX = data.labelOffsetX || 0;
    const offsetY = data.labelOffsetY || 0;

    const text = new PIXI.Text({
        text: data.zoneLabel || data.name || "Zone",
        style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: fontSize,
            fontWeight: 'bold',
            fill: fontColor,
            align: 'center'
        }
    });
    text.anchor.set(0.5);
    text.eventMode = 'none';

    if (labelsLayer) {
        const rotation = container.rotation;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        const rotatedOffsetX = offsetX * cos - offsetY * sin;
        const rotatedOffsetY = offsetX * sin + offsetY * cos;

        text.x = container.x + rotatedOffsetX;
        text.y = container.y + rotatedOffsetY;
        text.rotation = rotation;
        labelsLayer.addChild(text);
    } else {
        text.x = (width / 2) + offsetX;
        text.y = (height / 2) + offsetY;
        container.addChild(text);
    }

    container.zoneLabel = text;
}

/**
 * Create section background graphics
 * @param {Object} data - Section data
 * @returns {{ graphics: PIXI.Graphics, fillAlpha: number, strokeAlpha: number, fillColor: number }}
 */
export function createSectionBackground(data) {
    const graphics = new PIXI.Graphics();
    const width = data.width;
    const height = data.height;
    
    const style = data.style || {};
    let fillColor, fillAlpha, strokeAlpha;

    if (data.isZone) {
        fillColor = data.sectionColor ?? style.sectionColor ?? 0xcccccc;
        const opacity = data.fillOpacity ?? style.opacity ?? 0.5;
        fillAlpha = opacity;
        strokeAlpha = opacity > 0.8 ? 1 : opacity + 0.2; 
    } else {
        fillColor = style.sectionColor ?? 0x3b82f6;
        fillAlpha = style.fillVisible === false ? 0 : ((style.opacity ?? 1) * 0.25);
        strokeAlpha = style.strokeVisible === false ? 0 : ((style.opacity ?? 1) * 0.8);
    }
    
    // Draw Shape (Polygon or Rect)
    if (data.points && data.points.length > 0) {
        graphics.poly(data.points);
    } else {
        graphics.rect(0, 0, width, height);
    }
    
    if (fillAlpha > 0) graphics.fill({ color: fillColor, alpha: fillAlpha });
    if (strokeAlpha > 0) graphics.stroke({ width: 2, color: fillColor, alpha: strokeAlpha });

    return { graphics, fillAlpha, strokeAlpha, fillColor };
}

/**
 * Create and position a section container
 * @param {Object} data - Section data
 * @returns {PIXI.Container}
 */
export function createSectionContainer(data) {
    const container = new PIXI.Container();
    const width = data.width;
    const height = data.height;

    // Pivot (Center of the section)
    container.pivot.set(width / 2, height / 2);
    
    // Position
    if (data.centerX !== undefined && data.centerY !== undefined) {
        container.x = data.centerX;
        container.y = data.centerY;
    } else {
        container.x = data.x + width / 2;
        container.y = data.y + height / 2;
    }

    // Rotation
    if (data.transform && data.transform.rotation) {
        container.angle = data.transform.rotation;
    }

    // Store dimensions
    container.sectionWidth = width;
    container.sectionHeight = height;

    return container;
}

/**
 * SeatMap Renderer
 * A lightweight renderer for SeatMap JS files (SMF format).
 */

export class SeatMapRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            backgroundColor: 0x0f0f13,
            backgroundAlpha: 1,
            resizeTo: container,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            ...options
        };

        this.app = new PIXI.Application();
        this.viewport = new PIXI.Container(); // Main container for the map content
        this.isDragging = false;
        this.lastPos = null;

        this.init();
    }

    async init() {
        await this.app.init(this.options);
        this.container.appendChild(this.app.canvas);
        this.app.stage.addChild(this.viewport);

        // Setup interaction (pan/zoom)
        this.setupInteraction();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.app.resize();
        });
    }

    setupInteraction() {
        // Simple pan and zoom implementation
        const stage = this.app.stage;
        stage.eventMode = 'static';
        stage.hitArea = this.app.screen;

        stage.on('pointerdown', (e) => {
            this.isDragging = true;
            this.lastPos = { x: e.global.x, y: e.global.y };
        });

        stage.on('pointerup', () => {
            this.isDragging = false;
        });

        stage.on('pointerupoutside', () => {
            this.isDragging = false;
        });

        stage.on('pointermove', (e) => {
            if (this.isDragging) {
                const newPos = { x: e.global.x, y: e.global.y };
                const dx = newPos.x - this.lastPos.x;
                const dy = newPos.y - this.lastPos.y;

                this.viewport.position.x += dx;
                this.viewport.position.y += dy;

                this.lastPos = newPos;
            }
        });

        // Zoom with wheel
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scaleFactor = 1.1;
            const direction = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
            
            // Calculate zoom center
            const rect = this.container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const localPos = {
                x: (x - this.viewport.x) / this.viewport.scale.x,
                y: (y - this.viewport.y) / this.viewport.scale.y
            };

            const newScale = this.viewport.scale.x * direction;
            
            // Limit zoom
            if (newScale > 0.1 && newScale < 5) {
                this.viewport.scale.set(newScale);
                this.viewport.position.x = x - localPos.x * newScale;
                this.viewport.position.y = y - localPos.y * newScale;
            }
        }, { passive: false });
    }

    /**
     * Load map data (SMF JSON)
     * @param {Object} data - The parsed JSON data
     */
    async loadData(data) {
        // Clear existing
        this.viewport.removeChildren();

        if (!data) {
            console.error("No data provided to loadData");
            return;
        }

        console.log("Loading map data...", data);

        // 1. Load Underlay (if present)
        if (data.underlay && data.underlay.visible !== false) {
            await this.renderUnderlay(data.underlay);
        }

        // 2. Render Sections
        if (data.sections) {
            for (const sectionData of data.sections) {
                this.renderSection(sectionData);
            }
        }

        // 3. Restore Viewport (Canvas settings)
        if (data.canvas) {
            this.viewport.position.set(data.canvas.panX || 0, data.canvas.panY || 0);
            this.viewport.scale.set(data.canvas.zoom || 1);
        } else {
            // Center map if no canvas data
            this.centerMap();
        }
    }

    async renderUnderlay(underlayData) {
        if (!underlayData.dataUrl) return;

        try {
            const texture = await PIXI.Assets.load(underlayData.dataUrl);
            const sprite = new PIXI.Sprite(texture);
            
            sprite.x = underlayData.x || 0;
            sprite.y = underlayData.y || 0;
            sprite.alpha = underlayData.opacity !== undefined ? underlayData.opacity : 1;
            
            const scale = underlayData.scale !== undefined ? underlayData.scale : 1;
            sprite.scale.set(scale);

            this.viewport.addChild(sprite);
        } catch (e) {
            console.error("Failed to load underlay image", e);
        }
    }

    renderSection(data) {
        const container = new PIXI.Container();
        
        // Position
        // Note: In the editor, x/y might be center or top-left depending on version.
        // SMF v2.0.0 uses top-left for x/y in serialization, but also stores centerX/centerY.
        // We'll use x/y as the position of the container.
        container.x = data.x;
        container.y = data.y;

        // Rotation
        if (data.transform && data.transform.rotation) {
            container.angle = data.transform.rotation;
        }

        // 1. Draw Section Background/Border
        const graphics = new PIXI.Graphics();
        container.addChild(graphics);

        const width = data.width;
        const height = data.height;
        
        // Style
        const style = data.style || {};
        const fillColor = style.sectionColor !== undefined ? style.sectionColor : 0x3b82f6;
        const fillAlpha = style.fillVisible === false ? 0 : (style.opacity !== undefined ? style.opacity * 0.25 : 0.25);
        const strokeAlpha = style.strokeVisible === false ? 0 : (style.opacity !== undefined ? style.opacity * 0.8 : 0.8);
        
        // Draw Rect
        graphics.rect(0, 0, width, height);
        if (fillAlpha > 0) graphics.fill({ color: fillColor, alpha: fillAlpha });
        if (strokeAlpha > 0) graphics.stroke({ width: 2, color: fillColor, alpha: strokeAlpha });

        // Pivot (Center of the section)
        container.pivot.set(width / 2, height / 2);
        
        // If we have centerX/centerY, we can use those to position the container more accurately
        if (data.centerX !== undefined && data.centerY !== undefined) {
            container.x = data.centerX;
            container.y = data.centerY;
        } else {
            // Adjust for pivot if using top-left x/y
            container.x += width / 2;
            container.y += height / 2;
        }

        // 2. Render Content (Seats or GA Label)
        if (data.type === 'ga') {
            this.renderGAContent(container, data, width, height);
        } else {
            this.renderSeatsAndLabels(container, data);
        }

        this.viewport.addChild(container);
    }

    renderGAContent(container, data, width, height) {
        // GA Label
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
        text.x = width / 2;
        text.y = height / 2;
        container.addChild(text);

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
            capText.x = width / 2;
            capText.y = height / 2 + 20;
            container.addChild(capText);
        }
    }

    renderSeatsAndLabels(container, data) {
        // Render Seats
        if (data.seats) {
            const style = data.style || {};
            const defaultSeatColor = style.seatColor !== undefined ? style.seatColor : 0xffffff;
            const defaultTextColor = style.seatTextColor !== undefined ? style.seatTextColor : 0x000000;
            
            // Glow settings
            const glow = style.glow || {};
            
            data.seats.forEach(seatData => {
                const seatContainer = new PIXI.Container();
                
                // Position
                // Use relativeX/Y if available (v2.0+), otherwise baseX/Y
                const x = seatData.relativeX !== undefined ? seatData.relativeX : seatData.baseX;
                const y = seatData.relativeY !== undefined ? seatData.relativeY : seatData.baseY;
                
                seatContainer.x = x;
                seatContainer.y = y;

                // Glow (if enabled)
                if (glow.enabled) {
                    const glowGraphics = new PIXI.Graphics();
                    const radius = 10 + ((glow.strength || 10) / 2);
                    glowGraphics.circle(0, 0, radius);
                    glowGraphics.fill({ color: glow.color || 0xffffff, alpha: glow.opacity || 0.5 });
                    
                    if (glow.blur > 0) {
                        const blurFilter = new PIXI.BlurFilter();
                        blurFilter.strength = glow.blur;
                        glowGraphics.filters = [blurFilter];
                    }
                    seatContainer.addChild(glowGraphics);
                }

                // Seat Circle
                const circle = new PIXI.Graphics();
                circle.circle(0, 0, 10);
                
                if (seatData.specialNeeds) {
                    circle.fill({ color: 0x2563eb }); // Blue for special needs
                } else {
                    circle.fill({ color: defaultSeatColor });
                }
                seatContainer.addChild(circle);

                // Seat Label/Icon
                let labelText = seatData.number || "";
                let fontStyle = {
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: 10,
                    fontWeight: 'bold',
                    fill: defaultTextColor,
                    align: 'center'
                };

                if (seatData.specialNeeds) {
                    labelText = 'accessible_forward'; // Material Symbol name
                    fontStyle.fontFamily = 'Material Symbols Outlined';
                    fontStyle.fontSize = 14;
                    fontStyle.fontWeight = 'normal';
                    fontStyle.fill = 0xffffff; // White icon on blue background
                }

                const text = new PIXI.Text({ text: labelText, style: fontStyle });
                text.anchor.set(0.5);
                seatContainer.addChild(text);

                // Interaction (Click/Hover)
                seatContainer.eventMode = 'static';
                seatContainer.cursor = 'pointer';
                
                // Add data to container for event handling
                seatContainer.seatData = seatData;
                seatContainer.sectionId = data.id;

                seatContainer.on('pointertap', (e) => {
                    e.stopPropagation();
                    this.onSeatClick(seatContainer);
                });

                container.addChild(seatContainer);
            });
        }

        // Render Row Labels
        if (data.rowLabels && data.rowLabels.type !== 'none' && !data.rowLabels.hidden) {
            // We need to reconstruct labels based on the config if they are not explicitly stored as objects in JSON
            // The SMF format stores configuration, but not individual label objects in the 'rowLabels' array usually.
            // Wait, looking at fileManager.js, it seems rowLabels are NOT serialized as individual objects in the JSON 'sections' array.
            // The JSON has a 'rowLabels' configuration object.
            // But wait, `fileManager.js` serializeSection function:
            /*
            rowLabels: {
                type: section.rowLabelType...
                ...
            }
            */
            // It does NOT save the individual label positions. We must recalculate them or rely on the fact that
            // the renderer doesn't need to be perfect editor-replica if it's just for display, BUT
            // for accurate display we should probably regenerate them.
            // However, `SeatManager.js` generates them.
            // Let's implement a simplified label generator here.
            
            this.renderRowLabels(container, data);
        }
    }

    renderRowLabels(container, sectionData) {
        const config = sectionData.rowLabels;
        if (!config || config.type === 'none') return;

        const seats = sectionData.seats || [];
        if (seats.length === 0) return;

        // Group seats by row index
        const rows = {};
        seats.forEach(seat => {
            if (!rows[seat.rowIndex]) rows[seat.rowIndex] = [];
            rows[seat.rowIndex].push(seat);
        });

        const rowIndices = Object.keys(rows).map(Number).sort((a, b) => a - b);
        const spacing = config.spacing || 20;
        const color = config.color !== undefined ? config.color : 0xffffff;

        rowIndices.forEach((rowIndex, arrayIndex) => {
            const rowSeats = rows[rowIndex];
            // Sort by x position
            rowSeats.sort((a, b) => {
                const ax = a.relativeX !== undefined ? a.relativeX : a.baseX;
                const bx = b.relativeX !== undefined ? b.relativeX : b.baseX;
                return ax - bx;
            });

            // Determine label text
            const totalRows = rowIndices.length;
            const labelIndex = config.reversed ? (totalRows - 1 - arrayIndex) : arrayIndex;
            const labelText = this.getRowLabelText(labelIndex, config.type, config.start);

            const firstSeat = rowSeats[0];
            const lastSeat = rowSeats[rowSeats.length - 1];
            
            const firstX = firstSeat.relativeX !== undefined ? firstSeat.relativeX : firstSeat.baseX;
            const firstY = firstSeat.relativeY !== undefined ? firstSeat.relativeY : firstSeat.baseY;
            
            const lastX = lastSeat.relativeX !== undefined ? lastSeat.relativeX : lastSeat.baseX;
            const lastY = lastSeat.relativeY !== undefined ? lastSeat.relativeY : lastSeat.baseY;

            const style = {
                fontFamily: 'system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 'bold',
                fill: color,
                align: 'center'
            };

            if (config.showLeft) {
                const text = new PIXI.Text({ text: labelText, style });
                text.anchor.set(0.5);
                text.x = firstX - 10 - spacing;
                text.y = firstY;
                if (config.hidden) text.alpha = 0.6;
                container.addChild(text);
            }

            if (config.showRight) {
                const text = new PIXI.Text({ text: labelText, style });
                text.anchor.set(0.5);
                text.x = lastX + 10 + spacing;
                text.y = lastY;
                if (config.hidden) text.alpha = 0.6;
                container.addChild(text);
            }
        });
    }

    getRowLabelText(index, type, startValue) {
        if (type === 'numbers') {
            const start = parseInt(startValue) || 1;
            return (index + start).toString();
        } else if (type === 'letters') {
            const start = startValue || 'A';
            const startCharCode = start.charCodeAt(0);
            const offset = startCharCode - 65;
            
            let labelIndex = index + offset;
            let label = '';
            
            while (labelIndex >= 0) {
                label = String.fromCharCode(65 + (labelIndex % 26)) + label;
                labelIndex = Math.floor(labelIndex / 26) - 1;
            }
            return label;
        }
        return '';
    }

    centerMap() {
        const bounds = this.viewport.getBounds();
        if (bounds.width === 0 || bounds.height === 0) return;

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const padding = 50;

        const scaleX = (screenWidth - padding * 2) / bounds.width;
        const scaleY = (screenHeight - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, 1);

        this.viewport.scale.set(scale);
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        
        this.viewport.position.x = (screenWidth / 2) - (centerX * scale);
        this.viewport.position.y = (screenHeight / 2) - (centerY * scale);
    }

    onSeatClick(seatContainer) {
        console.log("Seat clicked:", seatContainer.seatData);
        // Dispatch event
        const event = new CustomEvent('seat-click', { 
            detail: { 
                seat: seatContainer.seatData,
                sectionId: seatContainer.sectionId
            } 
        });
        this.container.dispatchEvent(event);
    }
}

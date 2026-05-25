/**
 * FootstepAnimation - Self-contained footstep animation effect
 * 
 * A plug-and-play module that renders animated footstep sequences
 * on top of the underlay but behind seats and UI.
 * 
 * Usage:
 *   const footsteps = new FootstepAnimation(pixiApp, viewport, underlayBounds);
 *   await footsteps.init();
 *   footsteps.start();
 *   // Later: footsteps.stop(); footsteps.destroy();
 */

import * as PIXI from 'pixi.js';

export class FootstepAnimation {
    static CONFIG = {
        // Animation timing
        STEP_INTERVAL_MS: 600,           // Time between each step appearing
        STEP_FADE_DURATION_MS: 2000,     // How long a step takes to fade out
        SEQUENCE_DURATION_MS: 5000,      // Minimum duration per sequence
        SPAWN_INTERVAL_MS: 2600,         // Time between new sequence spawns
        MAX_CONCURRENT_SEQUENCES: 9,     // Max simultaneous walking sequences
        
        // Step appearance
        STEPS_PER_SEQUENCE_MIN: 6,
        STEPS_PER_SEQUENCE_MAX: 18,
        STEP_FORWARD_DISTANCE: 35,       // Forward distance per step
        STEP_LATERAL_OFFSET: 12,         // Side-to-side offset (left vs right foot)
        STEP_SIZE: 24,                   // Base size of footprint
        STEP_ALPHA: 0.6,                 // Starting opacity
        
        // Path variation
        CURVE_INTENSITY: 0.3,            // How much the path can curve (0-1)
        DIRECTION_CHANGE_CHANCE: 0.15,   // Chance to change direction per step
        
        // Colors
        FOOTPRINT_COLOR: 0x382518,       // Blue-ish footprint color
        FOOTPRINT_TINT: 0xffffff,        // Tint applied to sprites
    };

    /**
     * @param {PIXI.Application} app - The PixiJS application
     * @param {PIXI.Container} viewport - The viewport container
     * @param {Object} underlayBounds - { x, y, width, height } of the underlay
     * @param {Object} options - Optional configuration overrides
     */
    constructor(app, viewport, underlayBounds, options = {}) {
        this.app = app;
        this.viewport = viewport;
        this.underlayBounds = underlayBounds;
        this.options = { ...FootstepAnimation.CONFIG, ...options };
        
        this.container = null;
        this.activeSequences = [];
        this.isRunning = false;
        this.spawnIntervalId = null;
        
        this.leftFootTexture = null;
        this.rightFootTexture = null;
        this.texturesLoaded = false;
    }

    /**
     * Initialize the animation system
     */
    async init() {
        this.container = new PIXI.Container();
        this.container.label = 'footstep-effects';
        
        // Insert above underlay but below sections
        const underlayIndex = this.viewport.children.findIndex(
            child => child.isUnderlay === true
        );
        
        if (underlayIndex >= 0) {
            this.viewport.addChildAt(this.container, underlayIndex + 1);
        } else {
            this.viewport.addChildAt(this.container, 0);
        }
        
        await this.loadTextures();
        return this;
    }

    /**
     * Load footprint textures - falls back to procedural if not found
     */
    async loadTextures() {
        try {
            this.leftFootTexture = await PIXI.Assets.load('./assets/foot-l.svg');
            this.rightFootTexture = await PIXI.Assets.load('./assets/foot-r.svg');
            this.texturesLoaded = true;
            console.log('FootstepAnimation: Loaded SVG foot textures');
        } catch (e) {
            console.warn('FootstepAnimation: Could not load foot textures, using procedural fallback');
            this.createProceduralTextures();
        }
    }

    /**
     * Create procedural foot textures as fallback
     */
    createProceduralTextures() {
        const size = this.options.STEP_SIZE * 2;
        
        const leftGraphics = new PIXI.Graphics();
        this.drawFootShape(leftGraphics, size, false);
        this.leftFootTexture = this.app.renderer.generateTexture(leftGraphics);
        leftGraphics.destroy();
        
        const rightGraphics = new PIXI.Graphics();
        this.drawFootShape(rightGraphics, size, true);
        this.rightFootTexture = this.app.renderer.generateTexture(rightGraphics);
        rightGraphics.destroy();
        
        this.texturesLoaded = true;
    }

    /**
     * Draw a simple foot shape
     */
    drawFootShape(graphics, size, isRight) {
        const color = this.options.FOOTPRINT_COLOR;
        const mirror = isRight ? -1 : 1;
        const cx = size / 2;
        const cy = size / 2;
        
        graphics.fill({ color, alpha: 0.9 });
        
        // Main foot oval
        graphics.ellipse(cx, cy + 4, size * 0.3, size * 0.4);
        graphics.fill();
        
        // Toes
        const toeRadius = size * 0.07;
        const toeY = cy - size * 0.35;
        const toeSpacing = size * 0.11;
        
        for (let i = 0; i < 5; i++) {
            const offsetX = (i - 2) * toeSpacing * mirror;
            const offsetY = Math.abs(i - 2) * 2;
            graphics.circle(cx + offsetX, toeY + offsetY, toeRadius);
            graphics.fill();
        }
    }

    /**
     * Start the animation system
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.spawnSequence();
        
        this.spawnIntervalId = setInterval(() => {
            if (this.activeSequences.length < this.options.MAX_CONCURRENT_SEQUENCES) {
                this.spawnSequence();
            }
        }, this.options.SPAWN_INTERVAL_MS);
    }

    /**
     * Stop the animation system
     */
    stop() {
        this.isRunning = false;
        
        if (this.spawnIntervalId) {
            clearInterval(this.spawnIntervalId);
            this.spawnIntervalId = null;
        }
    }

    /**
     * Spawn a new footstep sequence
     */
    spawnSequence() {
        if (!this.texturesLoaded || !this.isRunning) return;
        
        const bounds = this.underlayBounds;
        const padding = this.options.STEP_SIZE * 3;
        
        const startX = bounds.x + padding + Math.random() * (bounds.width - padding * 2);
        const startY = bounds.y + padding + Math.random() * (bounds.height - padding * 2);
        const direction = Math.random() * Math.PI * 2;
        
        const stepCount = this.options.STEPS_PER_SEQUENCE_MIN + 
            Math.floor(Math.random() * (this.options.STEPS_PER_SEQUENCE_MAX - this.options.STEPS_PER_SEQUENCE_MIN + 1));
        
        const sequence = {
            id: Date.now() + Math.random(),
            steps: [],
            currentStep: 0,
            totalSteps: stepCount,
            x: startX,
            y: startY,
            direction: direction,
            isLeft: Math.random() > 0.5,
            container: new PIXI.Container(),
            intervalId: null,
            complete: false
        };
        
        this.container.addChild(sequence.container);
        this.activeSequences.push(sequence);
        
        this.addStep(sequence);
        sequence.intervalId = setInterval(() => {
            if (sequence.currentStep < sequence.totalSteps && this.isRunning) {
                this.addStep(sequence);
            } else {
                clearInterval(sequence.intervalId);
                sequence.intervalId = null;
                sequence.complete = true;
            }
        }, this.options.STEP_INTERVAL_MS);
    }

    /**
     * Add a single step to a sequence
     */
    addStep(sequence) {
        const bounds = this.underlayBounds;
        const padding = this.options.STEP_SIZE;
        
        const forward = this.options.STEP_FORWARD_DISTANCE;
        const lateral = this.options.STEP_LATERAL_OFFSET * (sequence.isLeft ? -1 : 1);
        
        // Add some curve/randomness to direction
        if (Math.random() < this.options.DIRECTION_CHANGE_CHANCE) {
            sequence.direction += (Math.random() - 0.5) * Math.PI * this.options.CURVE_INTENSITY;
        }
        
        // Calculate new position
        let newX = sequence.x + Math.cos(sequence.direction) * forward + 
                   Math.cos(sequence.direction + Math.PI / 2) * lateral;
        let newY = sequence.y + Math.sin(sequence.direction) * forward + 
                   Math.sin(sequence.direction + Math.PI / 2) * lateral;
        
        // Bounce off boundaries
        if (newX < bounds.x + padding || newX > bounds.x + bounds.width - padding) {
            sequence.direction = Math.PI - sequence.direction;
            newX = Math.max(bounds.x + padding, Math.min(bounds.x + bounds.width - padding, newX));
        }
        if (newY < bounds.y + padding || newY > bounds.y + bounds.height - padding) {
            sequence.direction = -sequence.direction;
            newY = Math.max(bounds.y + padding, Math.min(bounds.y + bounds.height - padding, newY));
        }
        
        sequence.x = newX;
        sequence.y = newY;
        
        // Create footprint sprite
        const texture = sequence.isLeft ? this.leftFootTexture : this.rightFootTexture;
        const step = new PIXI.Sprite(texture);
        
        step.anchor.set(0.5);
        step.x = newX;
        step.y = newY;
        step.alpha = this.options.STEP_ALPHA;
        step.tint = this.options.FOOTPRINT_TINT;
        
        // Rotate foot to match walking direction
        // SVGs are oriented facing UP (toward -Y), so we need to rotate based on direction
        // direction = 0 means walking right (+X), so we need to add PI/2 to rotate from up to right
        step.rotation = sequence.direction + Math.PI / 2;
        
        const scale = this.options.STEP_SIZE / Math.max(texture.width, texture.height);
        step.scale.set(scale);
        
        sequence.container.addChild(step);
        sequence.steps.push(step);
        
        // Start fade out animation
        this.fadeOutStep(step, sequence);
        
        // Alternate feet
        sequence.isLeft = !sequence.isLeft;
        sequence.currentStep++;
    }

    /**
     * Fade out a step over time
     */
    fadeOutStep(step, sequence) {
        const duration = this.options.STEP_FADE_DURATION_MS;
        const startTime = Date.now();
        const startAlpha = step.alpha;
        
        const animate = () => {
            if (!this.isRunning && sequence.complete) {
                this.removeStep(step, sequence);
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            step.alpha = startAlpha * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.removeStep(step, sequence);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Remove a step and clean up sequence if needed
     */
    removeStep(step, sequence) {
        const index = sequence.steps.indexOf(step);
        if (index > -1) {
            sequence.steps.splice(index, 1);
        }
        
        if (step.parent) {
            step.parent.removeChild(step);
        }
        step.destroy();
        
        // Clean up sequence if all steps are gone
        if (sequence.complete && sequence.steps.length === 0) {
            this.removeSequence(sequence);
        }
    }

    /**
     * Remove a completed sequence
     */
    removeSequence(sequence) {
        const index = this.activeSequences.indexOf(sequence);
        if (index > -1) {
            this.activeSequences.splice(index, 1);
        }
        
        if (sequence.intervalId) {
            clearInterval(sequence.intervalId);
        }
        
        if (sequence.container.parent) {
            sequence.container.parent.removeChild(sequence.container);
        }
        sequence.container.destroy({ children: true });
    }

    /**
     * Clean up all resources
     */
    destroy() {
        this.stop();
        
        for (const sequence of [...this.activeSequences]) {
            this.removeSequence(sequence);
        }
        this.activeSequences = [];
        
        if (this.container) {
            if (this.container.parent) {
                this.container.parent.removeChild(this.container);
            }
            this.container.destroy({ children: true });
            this.container = null;
        }
        
        this.leftFootTexture = null;
        this.rightFootTexture = null;
        this.texturesLoaded = false;
    }

    /**
     * Update underlay bounds (if it changes)
     */
    setUnderlayBounds(bounds) {
        this.underlayBounds = bounds;
    }

    /**
     * Check if animation is currently running
     */
    get running() {
        return this.isRunning;
    }
}

export default FootstepAnimation;

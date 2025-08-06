/**
 * This module manages a dynamic health visualisation overlay that integrates with 
 * the Foundry VTT hotbar. It provides real-time health tracking with animated gradient fills,
 * character portraits, and bloodied state indicators.
 */

import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID, CONSTANTS } from '../../config.js';

/**
 * Configuration constants for the health display system
 */
const HEALTH_DISPLAY_CONFIG = {
    // Asset paths
    FRAME_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/health-display-variant-1-back.webp',
    FRONT_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/health-display-variant-1-front.webp',
    BLOODIED_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/bloodied.webp',

    // Dimensions
    CIRCLE_DIAMETER: 134,
    FRAME_SIZE: 150,
    CIRCLE_INSET: 0,
    
    // Behaviour thresholds
    PORTRAIT_THRESHOLD: 0.75,
    BLOODIED_THRESHOLD: 0.5,
    
    // Animation settings
    DEFAULT_ANIMATION_SPEED: 0.05,
    ANIMATION_THRESHOLD: 0.001,
    GRADIENT_SEGMENTS: 32,

    // Colour configuration using centralised constants
    HIGH_HEALTH_COLOUR: CONSTANTS.COLOURS.HEALTH.HIGH,
    LOW_HEALTH_COLOUR: CONSTANTS.COLOURS.HEALTH.LOW,
    HEALTH_TEXT_COLOUR: '#D4C8B8',
    TEMP_HEALTH_COLOUR: CONSTANTS.COLOURS.HEALTH.TEMPORARY,
    
    // Transition timings
    PORTRAIT_TRANSITION: '0.5s ease-in-out',
    BLOODIED_TRANSITION: '0.3s ease-in-out'
} as const;

/**
 * Cached gradient data structure for performance optimisation
 */
interface GradientCache {
    readonly segments: number;
    colours: readonly number[];
    calculated: boolean;
}

/**
 * Health display update parameters
 */
interface HealthDisplayData {
    health: number;
    healthPercentage: number;
    tempHealth?: number;
    portrait?: string | null;
}

export class HealthDisplayManager {

    private static readonly CIRCLE_OFFSET_TOP = 
        (HEALTH_DISPLAY_CONFIG.FRAME_SIZE - HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER) / 2 + 
        HEALTH_DISPLAY_CONFIG.CIRCLE_INSET;
    
    private static readonly CIRCLE_OFFSET_LEFT = 
        (HEALTH_DISPLAY_CONFIG.FRAME_SIZE - HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER) / 2 + 
        HEALTH_DISPLAY_CONFIG.CIRCLE_INSET;
    
    private readonly logger: FoundryLogger;
    
    // DOM elements
    private container: HTMLElement | null = null;
    private bloodiedImage: HTMLImageElement | null = null;
    private portraitImage: HTMLImageElement | null = null;
    
    // PIXI.js components
    private pixiApp: PIXI.Application | null = null;
    private fillCircle: PIXI.Graphics | null = null;
    private healthText: PIXI.Text | PIXI.Container | null = null;
    private ticker: PIXI.Ticker | null = null;

    // Animation state
    private fillLevel = 0;
    private targetFillLevel = 0;
    private animationSpeed: number = HEALTH_DISPLAY_CONFIG.DEFAULT_ANIMATION_SPEED;
    
    // Content state
    private currentPortraitPath: string | null = null;
    
    // Performance optimisation
    private readonly gradientCache: GradientCache = {
        segments: HEALTH_DISPLAY_CONFIG.GRADIENT_SEGMENTS,
        colours: [],
        calculated: false
    };

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthDisplayManager`);
    }

    /**
     * Initialises the health display system by registering Foundry hooks
     */
    public initialise(): void {
        Hooks.on('renderHotbar', this.onRenderHotbar.bind(this));
        this.logger.debug('HealthDisplayManager initialised with PIXI.js v7');
    }

    /**
     * Handles hotbar render events to inject the health display
     */
    private onRenderHotbar(hotbar: Hotbar, html: HTMLElement): void {
        this.logger.debug('Injecting health display into hotbar', { hotbar, html });

        if (document.getElementById('health-display')) {
            this.logger.debug('Health display already exists, skipping creation');
            return;
        }

        const hotbarElement = this.findHotbarElement(html);
        if (!hotbarElement) {
            this.logger.error('Could not find #hotbar element');
            return;
        }

        const healthDisplay = this.createHealthDisplayElement();
        hotbarElement.prepend(healthDisplay);
        hotbarElement.classList.add('has-health-display');

        this.container = healthDisplay;
        
        const controlledTokens = canvas.tokens?.controlled ?? [];
        if (controlledTokens.length === 0) {
            this.logger.debug('Health display created but remains hidden - no controlled tokens');
        }
        
        this.logger.debug('Health display successfully injected', { 
            visible: controlledTokens.length > 0,
            controlledCount: controlledTokens.length 
        });
    }

    /**
     * Locates the hotbar element within the provided HTML structure
     */
    private findHotbarElement(html: HTMLElement): HTMLElement | null {
        return html.id === 'hotbar' ? html : html.querySelector('#hotbar') as HTMLElement;
    }

    /**
     * Creates the complete health display DOM structure with proper layering
     */
    private createHealthDisplayElement(): HTMLElement {
        const healthDisplay = this.createContainer();
        const frameWrapper = this.createFrameWrapper();
        
        // Layer stack (bottom to top)
        const frameImage = this.createFrameImage();           // z-index: 1
        const portraitImage = this.createPortraitImage();     // z-index: 2
        const bloodiedImage = this.createBloodiedImage();     // z-index: 3
        const canvasWrapper = this.createCanvasWrapper();     // z-index: 4
        const frontImage = this.createFrontImage();           // z-index: 5

        this.initialisePixiApp(canvasWrapper);

        frameWrapper.append(frameImage, portraitImage, bloodiedImage, canvasWrapper, frontImage);
        healthDisplay.appendChild(frameWrapper);

        this.loadImagesAndInitialise(frameImage, bloodiedImage, frontImage);

        return healthDisplay;
    }

    /**
     * Creates the main container element
     */
    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'health-display';
        container.className = 'health-display';
        container.style.display = 'none'; // Start hidden by default
        return container;
    }

    /**
     * Creates the frame wrapper element for positioning
     */
    private createFrameWrapper(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'health-display-frame';
        wrapper.style.cssText = `
            position: relative;
            width: ${HEALTH_DISPLAY_CONFIG.FRAME_SIZE}px;
            height: ${HEALTH_DISPLAY_CONFIG.FRAME_SIZE}px;
        `;
        return wrapper;
    }

    /**
     * Creates the background frame image element
     */
    private createFrameImage(): HTMLImageElement {
        const img = document.createElement('img');
        img.src = HEALTH_DISPLAY_CONFIG.FRAME_IMAGE_PATH;
        img.alt = 'Health Display Frame';
        img.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        `;
        
        img.addEventListener('error', () => {
            this.logger.error(`Failed to load health display frame: ${HEALTH_DISPLAY_CONFIG.FRAME_IMAGE_PATH}`);
        }, { once: true });
        
        return img;
    }

    /**
     * Creates the character portrait image element with circular masking
     */
    private createPortraitImage(): HTMLImageElement {
        const img = document.createElement('img');
        img.alt = 'Character Portrait';
        img.style.cssText = `
            width: ${HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER}px;
            height: ${HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER}px;
            position: absolute;
            top: ${HealthDisplayManager.CIRCLE_OFFSET_TOP}px;
            left: ${HealthDisplayManager.CIRCLE_OFFSET_LEFT}px;
            z-index: 2;
            border-radius: 50%;
            object-fit: cover;
            opacity: 0;
            transition: opacity ${HEALTH_DISPLAY_CONFIG.PORTRAIT_TRANSITION};
            pointer-events: none;
        `;
        
        img.addEventListener('error', () => {
            this.logger.warn('Failed to load portrait image');
            img.style.opacity = '0';
        });
        
        this.portraitImage = img;
        return img;
    }

    /**
     * Creates the bloodied overlay image element for low health states
     */
    private createBloodiedImage(): HTMLImageElement {
        const img = document.createElement('img');
        img.src = HEALTH_DISPLAY_CONFIG.BLOODIED_IMAGE_PATH;
        img.alt = 'Bloodied Overlay';
        img.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 3;
            opacity: 0;
            transition: opacity ${HEALTH_DISPLAY_CONFIG.BLOODIED_TRANSITION};
            pointer-events: none;
        `;
        
        img.addEventListener('error', () => {
            this.logger.error(`Failed to load bloodied overlay: ${HEALTH_DISPLAY_CONFIG.BLOODIED_IMAGE_PATH}`);
        }, { once: true });
        
        this.bloodiedImage = img;
        return img;
    }

    /**
     * Creates the canvas wrapper for PIXI.js content
     */
    private createCanvasWrapper(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: absolute;
            top: ${HealthDisplayManager.CIRCLE_OFFSET_TOP}px;
            left: ${HealthDisplayManager.CIRCLE_OFFSET_LEFT}px;
            width: ${HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER}px;
            height: ${HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER}px;
            z-index: 4;
        `;
        return wrapper;
    }

    /**
     * Creates the front overlay image element for visual effects
     */
    private createFrontImage(): HTMLImageElement {
        const img = document.createElement('img');
        img.src = HEALTH_DISPLAY_CONFIG.FRONT_IMAGE_PATH;
        img.alt = 'Health Display Front Overlay';
        img.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 5;
            pointer-events: none;
        `;
        
        img.addEventListener('error', () => {
            this.logger.error(`Failed to load front overlay: ${HEALTH_DISPLAY_CONFIG.FRONT_IMAGE_PATH}`);
        }, { once: true });
        
        return img;
    }

    /**
     * Initialises the PIXI.js application.
     */
    private initialisePixiApp(canvasWrapper: HTMLElement): void {
        this.pixiApp = new PIXI.Application({
            width: HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER,
            height: HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        canvasWrapper.appendChild(this.pixiApp.view as HTMLCanvasElement);
    }

    /**
     * Loads required images and initialises PIXI.js content
     */
    private loadImagesAndInitialise(...images: HTMLImageElement[]): void {
        const imagePromises = images.map(img => this.loadImage(img.src));
        
        Promise.all(imagePromises)
            .then(() => this.createPixiContent())
            .catch(error => {
                this.logger.error('Failed to load health display images', error);
                // Create PIXI content anyway with fallback behaviour
                this.createPixiContent();
            });
    }

    /**
     * Helper method to load an image and return a promise
     */
    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Creates the dynamic PIXI.js content (fill circle and text)
     */
    private createPixiContent(): void {
        if (!this.pixiApp) return;

        this.fillCircle = new PIXI.Graphics();
        this.fillCircle.alpha = 0.7;
        this.pixiApp.stage.addChild(this.fillCircle);

        this.createHealthText();

        this.ticker = this.pixiApp.ticker;
        this.ticker.add(this.animate, this);

        this.updateFillCircle();
    }

    /**
     * Creates the initial health text element with default styling
     */
    private createHealthText(): void {
        if (!this.pixiApp) return;

        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Roboto Condensed',
            fontSize: 10,
            fontWeight: '400',
            align: 'center'
        });

        this.healthText = new PIXI.Text('', textStyle);
        this.healthText.anchor.set(0.5);

        const radius = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER / 2;
        this.healthText.position.set(radius, radius + (radius * 0.4));

        this.pixiApp.stage.addChild(this.healthText);
    }

    /**
     * Main animation loop for smooth health transitions using delta time
     */
    private animate(delta: number): void {
        if (Math.abs(this.fillLevel - this.targetFillLevel) < HEALTH_DISPLAY_CONFIG.ANIMATION_THRESHOLD) {
            this.fillLevel = this.targetFillLevel;
            this.updatePortraitVisibility();
            return;
        }

        const diff = this.targetFillLevel - this.fillLevel;
        this.fillLevel += diff * this.animationSpeed * delta;
        this.fillLevel = Math.max(0, Math.min(1, this.fillLevel));

        this.updatePortraitVisibility();
        this.updateFillCircle();
    }

    /**
     * Pre-calculates gradient colours once.
     */
    private calculateGradientCache(): void {
        const { HIGH, MEDIUM, LOW } = CONSTANTS.COLOURS.HEALTH;
        
        const lowColour = this.hexToNumber(LOW);
        const midColour = this.hexToNumber(MEDIUM);
        const highColour = this.hexToNumber(HIGH);
        
        const colours: number[] = [];
        
        for (let i = 0; i < this.gradientCache.segments; i++) {
            const percentage = ((this.gradientCache.segments - 1 - i) / (this.gradientCache.segments - 1)) * 100;
            
            let colour: number;
            if (percentage <= 50) {
                const factor = percentage / 50;
                colour = this.interpolateColour(lowColour, midColour, factor);
            } else {
                const factor = (percentage - 50) / 50;
                colour = this.interpolateColour(midColour, highColour, factor);
            }
            
            colours.push(colour);
        }
        
        this.gradientCache.colours = Object.freeze(colours);
        this.gradientCache.calculated = true;
        
        this.logger.debug('Gradient cache calculated', {
            segments: this.gradientCache.segments,
            colours: this.gradientCache.colours.length
        });
    }

    /**
     * Renders a gradient-filled circle using pre-calculated colours
     * Draws horizontal slices to create smooth gradient effect
     */
    private renderGradientCircle(
        graphics: PIXI.Graphics,
        centerX: number,
        centerY: number,
        radius: number
    ): void {
        const { segments, colours } = this.gradientCache;
        const sliceHeight = (radius * 2) / segments;
        
        for (let i = 0; i < segments; i++) {
            const y = -radius + (i * sliceHeight);
            const colour = colours[i];

            const distanceFromCenter = Math.abs(y + sliceHeight / 2);
            if (distanceFromCenter >= radius) continue;
            
            const halfWidth = Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter);

            graphics.beginFill(colour);
            graphics.drawRect(
                centerX - halfWidth,
                centerY + y,
                halfWidth * 2,
                sliceHeight
            );
            graphics.endFill();
        }
    }

    /**
     * Recursively cleans up existing masks to prevent memory leaks
     */
    private clearExistingMasks(): void {
        if (!this.fillCircle || !this.pixiApp) return;
        
        const cleanupMask = (mask: PIXI.DisplayObject): void => {
            if ('mask' in mask && mask.mask) {
                cleanupMask(mask.mask as PIXI.DisplayObject);
                mask.mask = null;
            }
            
            if (mask.parent) {
                mask.parent.removeChild(mask);
            }
            
            if ('destroy' in mask && typeof mask.destroy === 'function') {
                mask.destroy();
            }
        };
        
        if (this.fillCircle.mask) {
            cleanupMask(this.fillCircle.mask as PIXI.DisplayObject);
            this.fillCircle.mask = null;
        }
    }

    /**
     * Updates the fill circle visualisation with gradient and masking
     */
    private updateFillCircle(): void {
        if (!this.fillCircle || !this.pixiApp) return;

        const radius = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER / 2;
        const centerX = radius;
        const centerY = radius;

        this.fillCircle.clear();
        this.clearExistingMasks();

        this.updateBloodiedOverlay();

        if (this.fillLevel <= 0) return;

        if (!this.gradientCache.calculated) {
            this.calculateGradientCache();
        }

        this.renderGradientCircle(this.fillCircle, centerX, centerY, radius);

        const combinedMask = new PIXI.Graphics();
        
        if (this.fillLevel < 1) {
            const fillHeight = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER * this.fillLevel;
            const startY = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER - fillHeight;
            
            combinedMask.beginFill(0xFFFFFF);
            combinedMask.drawRect(0, startY, HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER, fillHeight);
            combinedMask.endFill();

            const circleClip = new PIXI.Graphics();
            circleClip.beginFill(0xFFFFFF);
            circleClip.drawCircle(centerX, centerY, radius);
            circleClip.endFill();
            
            combinedMask.mask = circleClip;
            this.pixiApp.stage.addChild(circleClip);
        } else {
            combinedMask.beginFill(0xFFFFFF);
            combinedMask.drawCircle(centerX, centerY, radius);
            combinedMask.endFill();
        }
        
        this.fillCircle.mask = combinedMask;
        this.pixiApp.stage.addChild(combinedMask);
    }

    /**
     * Interpolates between two colours using linear interpolation
     */
    private interpolateColour(colour1: number, colour2: number, factor: number): number {
        factor = Math.max(0, Math.min(1, factor));

        const r1 = (colour1 >> 16) & 0xFF;
        const g1 = (colour1 >> 8) & 0xFF;
        const b1 = colour1 & 0xFF;

        const r2 = (colour2 >> 16) & 0xFF;
        const g2 = (colour2 >> 8) & 0xFF;
        const b2 = colour2 & 0xFF;

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return (r << 16) | (g << 8) | b;
    }

    /**
     * Converts hex colour string to numeric value for PIXI.js
     */
    private hexToNumber(hex: string): number {
        return parseInt(hex.replace('#', ''), 16);
    }

    /**
     * Updates bloodied overlay visibility and intensity based on health level
     */
    private updateBloodiedOverlay(): void {
        if (!this.bloodiedImage) return;

        if (this.fillLevel < HEALTH_DISPLAY_CONFIG.BLOODIED_THRESHOLD && this.fillLevel > 0) {
            const scaledHealth = this.fillLevel * 2; // Normalise to 0-1 range
            const opacityRange = 1 - scaledHealth;
            const opacity = 0.1 + (0.8 * opacityRange); // 0.1 to 0.9 opacity range
            this.bloodiedImage.style.opacity = opacity.toString();
        } else {
            this.bloodiedImage.style.opacity = '0';
        }
    }

    /**
     * Sets and loads the character portrait image
     */
    private setPortrait(portraitPath: string | null): void {
        if (!this.portraitImage) {
            this.logger.error('Portrait image element not found');
            return;
        }

        if (!portraitPath) {
            this.portraitImage.src = '';
            this.portraitImage.style.opacity = '0';
            this.currentPortraitPath = null;
            return;
        }

        if (this.currentPortraitPath === portraitPath) {
            this.updatePortraitVisibility();
            return;
        }

        this.currentPortraitPath = portraitPath;
        this.portraitImage.src = portraitPath;

        this.portraitImage.onload = () => {
            this.updatePortraitVisibility();
            this.logger.debug('Portrait loaded successfully', {
                portraitPath,
                visible: this.targetFillLevel > HEALTH_DISPLAY_CONFIG.PORTRAIT_THRESHOLD
            });
        };

        this.portraitImage.onerror = () => {
            this.logger.error('Failed to load portrait', { portraitPath });
            this.portraitImage!.style.opacity = '0';
            this.currentPortraitPath = null;
        };
    }

    /**
     * Updates portrait visibility based on health threshold
     */
    private updatePortraitVisibility(): void {
        if (!this.portraitImage) return;

        const effectiveLevel = Math.max(this.fillLevel, this.targetFillLevel);
        const shouldShow = effectiveLevel > HEALTH_DISPLAY_CONFIG.PORTRAIT_THRESHOLD && !!this.currentPortraitPath;
        const currentOpacity = this.portraitImage.style.opacity;
        const targetOpacity = shouldShow ? '1' : '0';

        if (currentOpacity !== targetOpacity) {
            this.portraitImage.style.opacity = targetOpacity;
        }
    }

    /**
     * Updates health text display with support for temporary health
     */
    private updateHealthText(health: number, tempHealth?: number): void {
        if (!this.healthText || !this.pixiApp) return;

        if (health === 0) {
            this.healthText.visible = false;
            return;
        }

        this.healthText.visible = true;

        const healthStyle = new PIXI.TextStyle({
            fontFamily: 'Roboto Condensed',
            fontSize: 20,
            fontWeight: '400',
            fill: HEALTH_DISPLAY_CONFIG.HEALTH_TEXT_COLOUR,
            align: 'center'
        });

        const tempHealthStyle = new PIXI.TextStyle({
            fontFamily: 'Roboto Condensed',
            fontSize: 14,
            fontWeight: '400',
            fill: HEALTH_DISPLAY_CONFIG.TEMP_HEALTH_COLOUR,
            align: 'center'
        });

        const isCurrentlyContainer = !(this.healthText instanceof PIXI.Text);
        const needsContainer = !!(tempHealth && tempHealth > 0);

        if (needsContainer !== isCurrentlyContainer) {
            if (this.healthText?.parent) {
                this.healthText.parent.removeChild(this.healthText);
                this.healthText.destroy();
                this.healthText = null;
            }
        }

        if (needsContainer) {
            this.createOrUpdateHealthContainer(health, tempHealth!, healthStyle, tempHealthStyle);
        } else {
            this.createOrUpdateSimpleHealthText(health, healthStyle);
        }
    }

    /**
     * Creates or updates health container with temporary health display
     */
    private createOrUpdateHealthContainer(
        health: number, 
        tempHealth: number, 
        healthStyle: PIXI.TextStyle, 
        tempHealthStyle: PIXI.TextStyle
    ): void {
        if (!this.pixiApp) return;

        if (!this.healthText || this.healthText instanceof PIXI.Text) {
            const textContainer = new PIXI.Container();

            const healthTextObj = new PIXI.Text(`${health}`, healthStyle);
            const tempHealthTextObj = new PIXI.Text(`${tempHealth}`, tempHealthStyle);

            healthTextObj.anchor.set(0, 0.5);
            tempHealthTextObj.anchor.set(0, 0.5);

            const totalWidth = healthTextObj.width + 4 + tempHealthTextObj.width;
            const startX = -totalWidth / 2;

            healthTextObj.position.x = startX;
            tempHealthTextObj.position.x = startX + healthTextObj.width + 4;

            textContainer.addChild(healthTextObj, tempHealthTextObj);

            const radius = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER / 2;
            textContainer.position.set(radius, radius + (radius * 0.4));

            this.pixiApp.stage.addChild(textContainer);
            this.healthText = textContainer;
        } else {
            const container = this.healthText as PIXI.Container;
            
            if (container.children.length >= 2) {
                const healthTextChild = container.children[0] as PIXI.Text;
                const tempHealthTextChild = container.children[1] as PIXI.Text;
                
                if (healthTextChild instanceof PIXI.Text && tempHealthTextChild instanceof PIXI.Text) {
                    healthTextChild.text = `${health}`;
                    tempHealthTextChild.text = `${tempHealth}`;

                    const totalWidth = healthTextChild.width + 4 + tempHealthTextChild.width;
                    const startX = -totalWidth / 2;
                    
                    healthTextChild.position.x = startX;
                    tempHealthTextChild.position.x = startX + healthTextChild.width + 4;
                } else {
                    this.recreateHealthText(health, tempHealth);
                }
            } else {
                this.recreateHealthText(health, tempHealth);
            }
        }
    }

    /**
     * Creates or updates simple health text without temporary health
     */
    private createOrUpdateSimpleHealthText(health: number, healthStyle: PIXI.TextStyle): void {
        if (!this.pixiApp) return;

        if (!this.healthText || !(this.healthText instanceof PIXI.Text)) {
            this.healthText = new PIXI.Text(`${health}`, healthStyle);
            this.healthText.anchor.set(0.5);

            const radius = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER / 2;
            this.healthText.position.set(radius, radius + (radius * 0.4));

            this.pixiApp.stage.addChild(this.healthText);
        } else {
            this.healthText.style = healthStyle;
            this.healthText.text = `${health}`;
        }
    }

    /**
     * Helper method to completely recreate health text display
     */
    private recreateHealthText(health: number, tempHealth?: number): void {
        if (this.healthText?.parent) {
            this.healthText.parent.removeChild(this.healthText);
            this.healthText.destroy();
            this.healthText = null;
        }
        this.updateHealthText(health, tempHealth);
    }

    /**
     * Sets the fill level with optional animation
     */
    private setFillLevel(level: number): void {
        const newLevel = Math.max(0, Math.min(1, level));

        if (newLevel === 0) {
            this.fillLevel = newLevel;
            this.targetFillLevel = newLevel;
            this.updateFillCircle();
        } else {
            this.targetFillLevel = newLevel;
        }

        this.logger.debug(`Health fill target set to ${(this.targetFillLevel * 100).toFixed(0)}%`);
    }

    // ===== PUBLIC API =====

    /**
     * Sets the animation speed for health transitions
     */
    public setAnimationSpeed(speed: number): void {
        this.animationSpeed = Math.max(0.01, Math.min(1, speed));
    }

    /**
     * Updates the health display with new values
     */
    public updateHealthDisplay(data: HealthDisplayData): void;
    public updateHealthDisplay(
        health: number, 
        healthPercentage: number, 
        tempHealth?: number, 
        portrait?: string | null
    ): void;
    public updateHealthDisplay(
        healthOrData: number | HealthDisplayData,
        healthPercentage?: number,
        tempHealth?: number,
        portrait?: string | null
    ): void {
        let health: number;
        let percentage: number;
        let temp: number | undefined;
        let portraitPath: string | null | undefined;

        if (typeof healthOrData === 'object') {
            ({ health, healthPercentage: percentage, tempHealth: temp, portrait: portraitPath } = healthOrData);
        } else {
            health = healthOrData;
            percentage = healthPercentage!;
            temp = tempHealth;
            portraitPath = portrait;
        }

        if (this.container && health > 0) {
            this.container.style.display = 'block';
        }
        
        this.setFillLevel(percentage);
        this.updateHealthText(health, temp);
        this.setPortrait(portraitPath ?? null);

        this.logger.debug('Health display updated', {
            health,
            healthPercentage: `${(percentage * 100).toFixed(0)}%`,
            tempHealth: temp ?? 'none',
            portrait: portraitPath ?? 'none',
            visible: health > 0
        });
    }

    /**
     * Clears the health display and hides all elements
     */
    public clear(): void {
        this.fillLevel = 0;
        this.targetFillLevel = 0;
        
        this.updateFillCircle();
        
        // Hide health text
        if (this.healthText) {
            this.healthText.visible = false;
            
            if (this.healthText instanceof PIXI.Text) {
                this.healthText.text = '';
            }
        }
        
        // Hide portrait with transition
        if (this.portraitImage) {
            this.portraitImage.style.opacity = '0';
            this.currentPortraitPath = null;
        }
        
        // Hide bloodied overlay
        if (this.bloodiedImage) {
            this.bloodiedImage.style.opacity = '0';
        }
        
        // Hide entire container
        if (this.container) {
            this.container.style.display = 'none';
        }
        
        this.logger.debug('Health display cleared and hidden');
    }

    /**
     * Checks if the health display is currently visible
     */
    public isVisible(): boolean {
        return this.container?.style.display !== 'none';
    }

    /**
     * Forces the health display to be hidden
     */
    public hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.logger.debug('Health display forcibly hidden');
    }

    /**
     * Forces the health display to be shown (if it has content)
     */
    public show(): void {
        if (this.container && this.fillLevel > 0) {
            this.container.style.display = 'block';
        }
        this.logger.debug('Health display shown', { hasContent: this.fillLevel > 0 });
    }

    /**
     * Destroys the health display and cleans up all resources
     * 
     * This method should be called when the health display is no longer needed
     * to prevent memory leaks and ensure proper cleanup.
     */
    public destroy(): void {
        this.gradientCache.calculated = false;
        (this.gradientCache.colours as number[]).length = 0;

        if (this.ticker) {
            this.ticker.remove(this.animate, this);
            this.ticker = null;
        }

        if (this.pixiApp) {
            if (this.healthText) {
                if (this.healthText instanceof PIXI.Container) {
                    this.healthText.destroy({ children: true });
                } else {
                    this.healthText.destroy();
                }
                this.healthText = null;
            }

            this.pixiApp.destroy(true);
            this.pixiApp = null;
            this.fillCircle = null;
        }

        this.bloodiedImage = null;
        this.portraitImage = null;
        this.currentPortraitPath = null;

        if (this.container) {
            const hotbar = document.getElementById('hotbar');
            if (hotbar) {
                hotbar.classList.remove('has-health-display');
            }

            this.container.remove();
            this.container = null;
        }
        
        this.logger.debug('Health display destroyed and resources cleaned up');
    }
}
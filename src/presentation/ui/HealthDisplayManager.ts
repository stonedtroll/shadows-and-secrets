/**
 * This module provides a visual health indicator that integrates with the game's hotbar.
 */
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

/**
 * Configuration constants for the health display
 */
const HEALTH_DISPLAY_CONFIG = {
    FRAME_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/health-display-variant-1-back.webp',
    FRONT_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/health-display-variant-1-front.webp',
    BLOODIED_IMAGE_PATH: 'modules/shadows-and-secrets/assets/images/ui/bloodied.webp',

    CIRCLE_DIAMETER: 133,
    FRAME_SIZE: 150,
    CIRCLE_INSET: 0,
    
    PORTRAIT_THRESHOLD: 0.75,  
    BLOODIED_THRESHOLD: 0.5,   
    
    DEFAULT_ANIMATION_SPEED: 0.05,
    ANIMATION_THRESHOLD: 0.001,

    HIGH_HEALTH_COLOUR: '#465C1A',  
    LOW_HEALTH_COLOUR: '#6A1A1A',   
    HEALTH_TEXT_COLOUR: '#D4C8B8',  
    TEMP_HEALTH_COLOUR: '#B34141',  
    
    PORTRAIT_TRANSITION: '0.5s ease-in-out',
    BLOODIED_TRANSITION: '0.3s ease-in-out'
} as const;

/**
 * Manages the health display overlay for the Foundry VTT hotbar.
 */
export class HealthDisplayManager {
    private readonly logger: FoundryLogger;
    
    private container: HTMLElement | null = null;
    private bloodiedImage: HTMLImageElement | null = null;
    private portraitImage: HTMLImageElement | null = null;
    
    private pixiApp: PIXI.Application | null = null;
    private fillCircle: PIXI.Graphics | null = null;
    private healthText: PIXI.Text | PIXI.Container | null = null;
    private ticker: PIXI.Ticker | null = null;

    private fillLevel = 0;
    private targetFillLevel = 0;
    private animationSpeed: number = HEALTH_DISPLAY_CONFIG.DEFAULT_ANIMATION_SPEED; 
    private currentPortraitPath: string | null = null;
    
    private static readonly CIRCLE_OFFSET_TOP = 
        (HEALTH_DISPLAY_CONFIG.FRAME_SIZE - HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER) / 2 + 
        HEALTH_DISPLAY_CONFIG.CIRCLE_INSET;
    
    private static readonly CIRCLE_OFFSET_LEFT = 
        (HEALTH_DISPLAY_CONFIG.FRAME_SIZE - HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER) / 2 + 
        HEALTH_DISPLAY_CONFIG.CIRCLE_INSET;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthDisplayManager`);
    }

    /**
     * Initialises the health display system by registering Foundry hooks
     */
    initialise(): void {
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
        this.logger.debug('Health display successfully injected');
    }

    /**
     * Finds the hotbar element within the provided HTML
     */
    private findHotbarElement(html: HTMLElement): HTMLElement | null {
        if (html.id === 'hotbar') {
            return html;
        }
        return html.querySelector('#hotbar') as HTMLElement;
    }

    /**
     * Creates the complete health display DOM structure
     */
    private createHealthDisplayElement(): HTMLElement {
        const healthDisplay = this.createContainer();
        const frameWrapper = this.createFrameWrapper();
        
        const frameImage = this.createFrameImage();           // z-index: 1
        const portraitImage = this.createPortraitImage();     // z-index: 2
        const bloodiedImage = this.createBloodiedImage();     // z-index: 3
        const canvasWrapper = this.createCanvasWrapper();     // z-index: 4
        const frontImage = this.createFrontImage();           // z-index: 5

        this.initializePixiApp(canvasWrapper);

        frameWrapper.appendChild(frameImage);
        frameWrapper.appendChild(portraitImage);
        frameWrapper.appendChild(bloodiedImage);
        frameWrapper.appendChild(canvasWrapper);
        frameWrapper.appendChild(frontImage);
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
        return container;
    }

    /**
     * Creates the frame wrapper element
     */
    private createFrameWrapper(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'health-display-frame';
        wrapper.style.position = 'relative';
        wrapper.style.width = `${HEALTH_DISPLAY_CONFIG.FRAME_SIZE}px`;
        wrapper.style.height = `${HEALTH_DISPLAY_CONFIG.FRAME_SIZE}px`;
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
     * Creates the portrait image element
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
     * Creates the bloodied overlay image element
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
     * Creates the canvas wrapper for PIXI content
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
     * Creates the front overlay image element
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
     * Initialises the PIXI application
     */
    private initializePixiApp(canvasWrapper: HTMLElement): void {
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
     * Loads required images and initialises PIXI content
     */
    private loadImagesAndInitialise(frameImage: HTMLImageElement, bloodiedImage: HTMLImageElement, frontImage: HTMLImageElement): void {
        Promise.all([
            this.loadImage(frameImage.src),
            this.loadImage(bloodiedImage.src),
            this.loadImage(frontImage.src)
        ]).then(() => {
            this.createPixiContent();
        }).catch(error => {
            this.logger.error('Failed to load health display images', error);
            // Create PIXI content anyway with default positioning
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
     * Creates the dynamic PIXI content (fill circle and text)
     */
    private createPixiContent(): void {
        if (!this.pixiApp) return;

        // Create fill circle
        this.fillCircle = new PIXI.Graphics();
        this.fillCircle.alpha = 0.3;
        this.pixiApp.stage.addChild(this.fillCircle);

        // Create health text
        this.createHealthText();

        // Start animation ticker
        this.ticker = this.pixiApp.ticker;
        this.ticker.add(this.animate, this);

        // Initial render
        this.updateFillCircle();
    }

    /**
     * Creates the initial health text element
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
        this.healthText.position.set(
            radius,
            radius + (radius * 0.4)
        );

        this.pixiApp.stage.addChild(this.healthText);
    }

    /**
     * Animation loop for smooth health transitions
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
     * Updates the fill circle visualisation
     */
    private updateFillCircle(): void {
        if (!this.fillCircle || !this.pixiApp) return;

        const radius = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER / 2;
        const centerX = radius;
        const centerY = radius;

        this.fillCircle.clear();
        if (this.fillCircle.mask) {
            this.pixiApp.stage.removeChild(this.fillCircle.mask as PIXI.DisplayObject);
            this.fillCircle.mask = null;
        }

        this.updateBloodiedOverlay();

        if (this.fillLevel <= 0) return;

        const healthColour = this.calculateHealthColour(
            this.fillLevel,
            HEALTH_DISPLAY_CONFIG.HIGH_HEALTH_COLOUR,
            HEALTH_DISPLAY_CONFIG.LOW_HEALTH_COLOUR
        );

        const colourNum = parseInt(healthColour.replace('#', ''), 16);
        this.fillCircle.beginFill(colourNum);

        this.fillCircle.drawCircle(centerX, centerY, radius);

        if (this.fillLevel < 1) {
            const fillHeight = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER * this.fillLevel;
            const startY = HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER - fillHeight;

            const mask = new PIXI.Graphics();
            mask.beginFill(0xFFFFFF);
            mask.drawRect(0, startY, HEALTH_DISPLAY_CONFIG.CIRCLE_DIAMETER, fillHeight);
            mask.endFill();

            this.fillCircle.mask = mask;
            this.pixiApp.stage.addChild(mask);
        }

        this.fillCircle.endFill();
    }

    /**
     * Updates the bloodied overlay visibility based on health
     */
    private updateBloodiedOverlay(): void {
        if (!this.bloodiedImage) return;

        if (this.fillLevel < HEALTH_DISPLAY_CONFIG.BLOODIED_THRESHOLD && this.fillLevel > 0) {
            const scaledHealth = this.fillLevel * 2; // 0 to 1 range
            const opacityRange = 1 - scaledHealth;
            const opacity = 0.1 + (0.4 * opacityRange); // 0.1 to 0.5 opacity range
            this.bloodiedImage.style.opacity = opacity.toString();
        } else {
            this.bloodiedImage.style.opacity = '0';
        }
    }

    /**
     * Calculates interpolated colour based on health percentage
     */
    private calculateHealthColour(
        healthPercentage: number,
        highHealthColour: string,
        lowHealthColour: string
    ): string {
        const highColourNum = parseInt(highHealthColour.replace('#', ''), 16);
        const lowColourNum = parseInt(lowHealthColour.replace('#', ''), 16);

        const highR = (highColourNum >> 16) & 0xFF;
        const highG = (highColourNum >> 8) & 0xFF;
        const highB = highColourNum & 0xFF;

        const lowR = (lowColourNum >> 16) & 0xFF;
        const lowG = (lowColourNum >> 8) & 0xFF;
        const lowB = lowColourNum & 0xFF;

        const t = Math.max(0, Math.min(1, 1 - healthPercentage));

        const lerp = (start: number, end: number, t: number): number => {
            return Math.round(start + (end - start) * t);
        };

        const r = lerp(highR, lowR, t);
        const g = lerp(highG, lowG, t);
        const b = lerp(highB, lowB, t);

        const toHex = (n: number): string => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Sets the portrait image
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
     * Updates portrait visibility based on health level
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
     * Updates the health text display
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
     * Creates or updates the health container with temp health
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

            textContainer.addChild(healthTextObj);
            textContainer.addChild(tempHealthTextObj);

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
     * Creates or updates simple health text (no temp health)
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
     * Helper method to recreate health text display
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
     * Sets the fill level with animation
     */
    private setFillLevel(level: number): void {
        const newLevel = Math.max(0, Math.min(1, level));

        // Force immediate update when dropping to 0
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
    setAnimationSpeed(speed: number): void {
        this.animationSpeed = Math.max(0.01, Math.min(1, speed));
    }

    /**
     * Updates the health display with new values
     */
    updateHealthDisplay(
        health: number, 
        healthPercentage: number, 
        tempHealth?: number, 
        portrait?: string | null
    ): void {
        this.setFillLevel(healthPercentage);
        this.updateHealthText(health, tempHealth);
        this.setPortrait(portrait ?? null);

        this.logger.debug('Health display updated', {
            health,
            healthPercentage: `${(healthPercentage * 100).toFixed(0)}%`,
            tempHealth: tempHealth ?? 'none',
            portrait: portrait ?? 'none'
        });
    }

    /**
     * Clears the health display (sets to zero and hides elements)
     */
    clear(): void {
        this.fillLevel = 0;
        this.targetFillLevel = 0;
        
        this.updateFillCircle();
        
        if (this.healthText) {
            this.healthText.visible = false;
            
            if (this.healthText instanceof PIXI.Text) {
                this.healthText.text = '';
            }
        }
        
        if (this.portraitImage) {
            this.portraitImage.style.opacity = '0';
        }
        
        this.logger.debug('Health display cleared');
    }

    /**
     * Destroys the health display and cleans up resources
     */
    destroy(): void {
        if (this.ticker) {
            this.ticker.remove(this.animate, this);
            this.ticker = null;
        }

        if (this.pixiApp) {
            if (this.healthText) {
                if (this.healthText instanceof PIXI.Container) {
                    this.healthText.destroy(true);
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
        
        this.logger.debug('Health display destroyed');
    }
}
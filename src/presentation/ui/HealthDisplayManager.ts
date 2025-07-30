import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

/**
 * Manages the health display overlay for the hotbar
 */
export class HealthDisplayManager {
    private readonly logger: FoundryLogger;
    private container: HTMLElement | null = null;
    private pixiApp: PIXI.Application | null = null;
    private fillCircle: PIXI.Graphics | null = null;
    private healthText: PIXI.Text | PIXI.Container | null = null; 
    private fillLevel = 0;
    private targetFillLevel = 0;
    private animationSpeed = 0.05; 
    private ticker: PIXI.Ticker | null = null;

    private static readonly HEALTH_DISPLAY_IMAGE_PATH = 'modules/shadows-and-secrets/assets/images/ui/health-display-frame.webp';
    private static readonly CIRCLE_DIAMETER = 122;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthDisplayManager`);
    }

    /**
     * Initialise the health display system
     */
    initialise(): void {
        Hooks.on('renderHotbar', this.onRenderHotbar.bind(this));
        this.logger.debug('HealthDisplayManager initialised with PIXI.js v7');
    }

    /**
     * Handle hotbar render to inject health display
     */
    private onRenderHotbar(hotbar: Hotbar, html: HTMLElement): void {
        this.logger.debug('Injecting health display into hotbar', { hotbar, html });

        if (document.getElementById('health-display')) {
            this.logger.debug('Health display already exists, skipping creation');
            return;
        }

        let hotbarElement = html;
        if (html.id !== 'hotbar') {

            const found = html.querySelector('#hotbar') as HTMLElement;
            if (!found) {
                this.logger.error('Could not find #hotbar element');
                return;
            }
            hotbarElement = found;
        }

        const healthDisplay = this.createHealthDisplayElement();

        hotbarElement.prepend(healthDisplay);

        hotbarElement.classList.add('has-health-display');

        this.logger.debug('Health display successfully injected with PIXI circle');

        this.container = healthDisplay;
    }

    /**
     * Create the health display DOM structure with PIXI canvas
     */
    private createHealthDisplayElement(): HTMLElement {

        const healthDisplay = document.createElement('div');
        healthDisplay.id = 'health-display';
        healthDisplay.className = 'health-display';

        const frameWrapper = document.createElement('div');
        frameWrapper.className = 'health-display-frame';
        frameWrapper.style.position = 'relative';
        frameWrapper.style.width = '150px';
        frameWrapper.style.height = '150px';

        const frameImage = document.createElement('img');
        frameImage.src = HealthDisplayManager.HEALTH_DISPLAY_IMAGE_PATH;
        frameImage.alt = 'Health Display Frame';
        frameImage.style.width = '100%';
        frameImage.style.height = '100%';
        frameImage.style.position = 'absolute';
        frameImage.style.top = '0';
        frameImage.style.left = '0';
        frameImage.style.zIndex = '1';

        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'absolute';
        canvasWrapper.style.top = '14px';
        canvasWrapper.style.left = '14px';
        canvasWrapper.style.width = `${HealthDisplayManager.CIRCLE_DIAMETER}px`;
        canvasWrapper.style.height = `${HealthDisplayManager.CIRCLE_DIAMETER}px`;
        canvasWrapper.style.zIndex = '2';


        this.pixiApp = new PIXI.Application({
            width: HealthDisplayManager.CIRCLE_DIAMETER,
            height: HealthDisplayManager.CIRCLE_DIAMETER,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        canvasWrapper.appendChild(this.pixiApp.view as HTMLCanvasElement);

        frameWrapper.appendChild(frameImage);
        frameWrapper.appendChild(canvasWrapper);
        healthDisplay.appendChild(frameWrapper);

        requestAnimationFrame(() => {
            this.createFillCircle();
        });

        frameImage.addEventListener('error', () => {
            this.logger.error(`Failed to load health display frame: ${HealthDisplayManager.HEALTH_DISPLAY_IMAGE_PATH}`);
        }, { once: true });

        return healthDisplay;
    }

    /**
     * Create the dynamic fill circle using PIXI Graphics
     */
    private createFillCircle(): void {
        if (!this.pixiApp) return;

        this.fillCircle = new PIXI.Graphics();
        this.fillCircle.alpha = 0.5;
        this.pixiApp.stage.addChild(this.fillCircle);

        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Roboto Condensed',
            fontSize: 10,
            fontWeight: '400',
            align: 'center'
        });

        this.healthText = new PIXI.Text('', textStyle);
        this.healthText.anchor.set(0.5); 

        const radius = HealthDisplayManager.CIRCLE_DIAMETER / 2;
        this.healthText.position.set(
            radius,
            radius + (radius * 0.4) 
        );

        this.pixiApp.stage.addChild(this.healthText);

        this.ticker = this.pixiApp.ticker;
        this.ticker.add(this.animate, this);

        this.updateFillCircle();
    }

    /**
     * Animation loop for smooth health transitions
     */
    private animate(delta: number): void {
        if (Math.abs(this.fillLevel - this.targetFillLevel) < 0.001) {
            this.fillLevel = this.targetFillLevel;
            return;
        }

        const diff = this.targetFillLevel - this.fillLevel;
        this.fillLevel += diff * this.animationSpeed * delta;

        if (Math.abs(diff) < 0.001) {
            this.fillLevel = this.targetFillLevel;
        } else {
            this.fillLevel = Math.max(0, Math.min(1, this.fillLevel));
        }

        this.updateFillCircle();
    }

    /**
     * Update the fill circle based on current fill level
     * Draws from bottom to top for health visualisation
     */
    private updateFillCircle(): void {
        if (!this.fillCircle || !this.pixiApp) return;

        const radius = HealthDisplayManager.CIRCLE_DIAMETER / 2;
        const centerX = radius;
        const centerY = radius;

        this.fillCircle.clear();
        if (this.fillCircle.mask) {
            this.pixiApp.stage.removeChild(this.fillCircle.mask as PIXI.DisplayObject);
            this.fillCircle.mask = null;
        }

        if (this.fillLevel <= 0) {
            return;
        }

        const highHealthColour = "#465C1A";
        const lowHealthColour = "#6A1A1A";

        const healthArcColour = this.calculateHealthColour(
            this.fillLevel,
            highHealthColour,
            lowHealthColour
        );

        const colourNum = parseInt(healthArcColour.replace('#', ''), 16);
        this.fillCircle.beginFill(colourNum);

        if (this.fillLevel >= 1) {
            this.fillCircle.drawCircle(centerX, centerY, radius);
        } else {
            this.fillCircle.drawCircle(centerX, centerY, radius);

            const fillHeight = HealthDisplayManager.CIRCLE_DIAMETER * this.fillLevel;
            const startY = HealthDisplayManager.CIRCLE_DIAMETER - fillHeight;

            const mask = new PIXI.Graphics();
            mask.beginFill(0xFFFFFF);
            mask.drawRect(0, startY, HealthDisplayManager.CIRCLE_DIAMETER, fillHeight);
            mask.endFill();

            this.fillCircle.mask = mask;
            this.pixiApp.stage.addChild(mask);
        }

        this.fillCircle.endFill();
    }

    /**
    * Calculates an interpolated colour based on health percentage.
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
     * Set the fill level of the health circle with animation
     */
    private setFillLevel(level: number): void {
        const newLevel = Math.max(0, Math.min(1, level));

        if (newLevel === 0 && this.targetFillLevel > 0.5) {
            this.fillLevel = newLevel;
            this.targetFillLevel = newLevel;
            this.updateFillCircle();
        } else {
            this.targetFillLevel = newLevel;
        }

        this.logger.debug(`Health fill target set to ${(this.targetFillLevel * 100).toFixed(0)}%`);
    }

    /**
     * Set animation speed (higher = faster)
     */
    setAnimationSpeed(speed: number): void {
        this.animationSpeed = Math.max(0.01, Math.min(1, speed));
    }

    /**
     * Update the health display with new values
     */
    updateHealthDisplay(health: number, healthPercentage: number, tempHealth?: number): void {

        this.setFillLevel(healthPercentage);

        this.updateHealthText(health, tempHealth);

        this.logger.debug('Health display updated', {
            health,
            healthPercentage: `${(healthPercentage * 100).toFixed(0)}%`,
            tempHealth: tempHealth ?? 'none'
        });
    }

    /**
     * Update the health text display
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
            fill: '#D4C8B8',
            align: 'center'
        });

        const tempHealthStyle = new PIXI.TextStyle({
            fontFamily: 'Roboto Condensed',
            fontSize: 14,
            fontWeight: '400',
            fill: '#B34141', 
            align: 'center'
        });

        const isCurrentlyContainer = !(this.healthText instanceof PIXI.Text);
        const needsContainer = tempHealth && tempHealth > 0;

        if (needsContainer !== isCurrentlyContainer) {
            if (this.healthText?.parent) {
                this.healthText.parent.removeChild(this.healthText);
                this.healthText.destroy();
                this.healthText = null;
            }
        }

        if (tempHealth && tempHealth > 0) {
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

                const radius = HealthDisplayManager.CIRCLE_DIAMETER / 2;
                textContainer.position.set(
                    radius,
                    radius + (radius * 0.4)
                );

                this.pixiApp.stage.addChild(textContainer);

                this.healthText = textContainer;
            } else {
                const container = this.healthText as PIXI.Container;
                
                if (container.children && container.children.length >= 2) {
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
                        this.logger.warn('Container children are not text objects, recreating...');
                        container.parent?.removeChild(container);
                        container.destroy(true);
                        this.healthText = null;
                        // Recursively call to recreate
                        this.updateHealthText(health, tempHealth);
                        return;
                    }
                } else {
                    this.logger.warn('Container missing expected children, recreating...');
                    container.parent?.removeChild(container);
                    container.destroy(true);
                    this.healthText = null;
                    this.updateHealthText(health, tempHealth);
                    return;
                }
            }
        } else {
            if (!this.healthText || !(this.healthText instanceof PIXI.Text)) {
                this.healthText = new PIXI.Text(`${health}`, healthStyle);
                this.healthText.anchor.set(0.5);

                const radius = HealthDisplayManager.CIRCLE_DIAMETER / 2;
                this.healthText.position.set(
                    radius,
                    radius + (radius * 0.4)
                );

                this.pixiApp.stage.addChild(this.healthText);
            } else {
                this.healthText.style = healthStyle;
                this.healthText.text = `${health}`;
            }
        }

        this.healthText.visible = true;
    }

    /**
     * Clear the health display
     * Sets fill to zero and hides all text
     */
    clear(): void {
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
        
        this.logger.debug('Health display cleared');
    }

    /**
     * Clean up the health display
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
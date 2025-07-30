/**
 * Common rendering utilities shared across multiple renderers
 */

import * as PIXI from 'pixi.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

export class RenderingUtils {
    private static readonly logger: FoundryLogger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.RenderingUtils`);

    /**
     * Transforms a colour value from various formats to a numeric PIXI colour
     */
    static transformColour(colour?: string | number): number {
        // Fast path for numeric values
        if (typeof colour === 'number') {
            return colour;
        }

        // Handle string hex colours
        if (typeof colour === 'string' && colour) {
            // Remove # prefix if present
            const hex = colour.charAt(0) === '#' ? colour.slice(1) : colour;

            // Validate hex length
            if (hex.length !== 3 && hex.length !== 6) {
                this.logger.error('Invalid hex colour format:', colour);
                return 0xFFFFFF; // Default white
            }

            // Expand shorthand hex (e.g., 'F0A' -> 'FF00AA')
            const fullHex = hex.length === 3
                ? hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)
                : hex;

            // Parse hex to number
            const parsed = parseInt(fullHex, 16);

            // Validate parsed result
            if (isNaN(parsed)) {
                this.logger.error('Failed to parse hex colour:', colour);
                return 0xFFFFFF; // Default white
            }

            return parsed;
        }

        // Default fallback
        return 0xFFFFFF; // Default white
    }

    /**
     * Creates an optimised PIXI.Text object with standard settings
     */
    static createOptimisedText(content: string, style: PIXI.TextStyle, alpha: number = 1): PIXI.Text {
        const text = new PIXI.Text(content, style);
        
        // Optimise for clarity and performance
        text.resolution = window.devicePixelRatio * 5
        text.updateText(true);
        text.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        text.texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
        text.alpha = alpha;
        
        return text;
    }

    /**
     * Creates a sprite from an icon path with standard settings
     */
    static createIconSprite(
        iconPath: string, 
        size: number, 
        tint?: string | number, 
        alpha: number = 1
    ): PIXI.Sprite {
        const texture = PIXI.Texture.from(iconPath);
        const sprite = new PIXI.Sprite(texture);
        
        sprite.width = size;
        sprite.height = size;
        sprite.anchor.set(0.5, 0.5); 
        sprite.alpha = alpha;
        
        if (tint !== undefined) {
            sprite.tint = this.transformColour(tint);
        }
        
        return sprite;
    }

    /**
     * Draws a filled rectangle with optional rounded corners
     */
    static drawBackground(
        graphics: PIXI.Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        colour: string | number,
        alpha: number = 1,
        radius: number = 0
    ): void {
        graphics.beginFill(this.transformColour(colour), alpha);
        
        if (radius > 0) {
            graphics.drawRoundedRect(x, y, width, height, radius);
        } else {
            graphics.drawRect(x, y, width, height);
        }
        
        graphics.endFill();
    }

    /**
     * Creates a container with a background
     */
    static createBackgroundContainer(
        width: number,
        height: number,
        backgroundColour?: string | number,
        backgroundOpacity: number = 0.6,
        padding: { x: number; y: number } = { x: 0, y: 0 }
    ): PIXI.Container {
        const container = new PIXI.Container();
        
        if (backgroundColour !== undefined) {
            const bg = new PIXI.Graphics();
            const bgWidth = width + padding.x;
            const bgHeight = height + padding.y;
            
            this.drawBackground(
                bg,
                -bgWidth / 2,
                -bgHeight / 2,
                bgWidth,
                bgHeight,
                backgroundColour,
                backgroundOpacity
            );
            
            container.addChild(bg);
        }
        
        return container;
    }

    /**
     * Builds a PIXI.TextStyle from common style configurations
     */
    static buildTextStyle(styleConfig: {
        font: string;
        fontSize: number;
        fontColour: string;
        fontWeight: string;
        fontOpacity?: number;
        dropShadow?: boolean;
        stroke?: boolean;
    }): PIXI.TextStyle {
        const fontWeight = styleConfig.fontWeight as PIXI.TextStyleFontWeight;
        
        const style: Partial<PIXI.ITextStyle> = {
            fontFamily: styleConfig.font,
            fontSize: styleConfig.fontSize,
            fontWeight: fontWeight,
            fill: this.transformColour(styleConfig.fontColour),
            align: 'center'
        };
        
        // Add legibility enhancements if requested
        if (styleConfig.dropShadow) {
            style.dropShadow = true;
            style.dropShadowColor = '#000000';
            style.dropShadowBlur = 4;
            style.dropShadowAngle = 0;
            style.dropShadowDistance = 0;
        }
        
        if (styleConfig.stroke) {
            style.stroke = '#000000';
            style.strokeThickness = 2;
        }
        
        return new PIXI.TextStyle(style);
    }

    /**
     * Clears and prepares a graphics object for rendering
     */
    static prepareGraphics(graphics: PIXI.Graphics): void {
        graphics.clear();
        graphics.removeChildren();
    }
}
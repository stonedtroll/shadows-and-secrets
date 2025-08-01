import type { OverlayRenderContext } from '../../domain/interfaces/OverlayRenderContext.js';

import * as PIXI from 'pixi.js';
import { MODULE_ID } from '../../config.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { RenderingUtils } from '../utils/RenderingUtils.js';

export class TokenInfoRenderer {
    private readonly logger: FoundryLogger;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.TokenInfoRenderer`);
    }

    render(graphics: PIXI.Graphics, context: OverlayRenderContext): void {
        RenderingUtils.prepareGraphics(graphics);

        const { token, tokenInfo, styling } = context;
        
        const trackingText = tokenInfo?.trackingReferenceNumber || '';

        if (!trackingText) {
            this.logger.debug('No tracking reference number to display', { tokenId: token.id });
            return;
        }

        const styleConfig = styling?.trackingReferenceNumber;
        
        if (!styleConfig) {
            this.logger.warn('No styling configuration found for tracking reference number', { tokenId: token.id });
            return;
        }

        const textStyle = RenderingUtils.buildTextStyle({
            font: styleConfig.font,
            fontSize: styleConfig.fontSize,
            fontColour: styleConfig.fontColour,
            fontWeight: styleConfig.fontWeight,
            fontOpacity: styleConfig.fontOpacity,
            dropShadow: false,
            stroke: false
        });

        const textObject = RenderingUtils.createOptimisedText(
            trackingText, 
            textStyle, 
            styleConfig.fontOpacity
        );

        textObject.anchor.set(0.5, 0.5);
        
        textObject.position.set(0, 0);

        graphics.addChild(textObject);

        this.logger.debug('Token info rendered using RenderingUtils', {
            tokenId: token.id,
            trackingText,
            position: {
                x: textObject.position.x,
                y: textObject.position.y
            },
            tokenDimensions: {
                width: token.width,
                height: token.height
            },
            appliedStyling: {
                font: styleConfig.font,
                fontSize: styleConfig.fontSize,
                fontColour: styleConfig.fontColour,
                fontWeight: styleConfig.fontWeight,
                fontOpacity: styleConfig.fontOpacity
            },
            textAnchor: {
                x: textObject.anchor.x,
                y: textObject.anchor.y
            }
        });
    }
}
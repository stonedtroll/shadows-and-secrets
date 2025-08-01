import type { OverlayContextBuilder } from '../../../domain/interfaces/OverlayContextBuilder.js';
import type { Token } from '../../../domain/entities/Token.js';
import type { OverlayRenderContext } from '../../../domain/interfaces/OverlayRenderContext.js';
import type { OverlayDefinition } from '../../../domain/interfaces/OverlayDefinition.js';

interface TokenInfoContextOptions {
    trackingReferenceNumber: string;
}

/**
 * Context builder for token information overlays.
 */
export class TokenInfoContextBuilder implements OverlayContextBuilder<TokenInfoContextOptions> {
    buildContext(
        targetToken: Token,
        overlayDefinition: OverlayDefinition,
        options: TokenInfoContextOptions
    ): OverlayRenderContext {

        const styling = overlayDefinition.styling;

        return {
            overlayTypeId: 'token-info',
            renderLayer: overlayDefinition.renderLayer,
            renderOnTokenMesh: overlayDefinition.renderOnTokenMesh,
            zIndex: overlayDefinition.zIndex,
            ...(styling && { styling }),
            overlayCentre: {
                x: targetToken.centre.x,
                y: targetToken.centre.y
            },
            token: {
                id: targetToken.id,
                name: targetToken.name,
                position: {
                    x: targetToken.position.x,
                    y: targetToken.position.y
                },
                width: targetToken.width,
                height: targetToken.height,
                centre: {
                    x: targetToken.centre.x,
                    y: targetToken.centre.y
                },
                radius: targetToken.radius,
                currentMovementMode: targetToken.currentMovementMode
            },
            tokenInfo: {
                trackingReferenceNumber: options.trackingReferenceNumber,
            },
        };
    }
}
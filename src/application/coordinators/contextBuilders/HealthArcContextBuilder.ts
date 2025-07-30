import type { OverlayContextBuilder } from '../../../domain/interfaces/OverlayContextBuilder.js';
import type { Token } from '../../../domain/entities/Token.js';
import type { OverlayRenderContext } from '../../../domain/interfaces/OverlayRenderContext.js';
import type { OverlayDefinition } from '../../../domain/interfaces/OverlayDefinition.js';

interface HealthArcContextOptions {
    isGM?: boolean;
    userColour?: string;
    healthArcStartAngle: number;
    healthArcEndAngle: number;
    healthArcColour: string;
    tempHealthArcStartAngle: number;
    tempHealthArcEndAngle: number;
    tempHealthArcColour: string;
    backgroundStartAngle: number;
    backgroundEndAngle: number;
    backgroundColour: string;
    arcRadius: number;
    arcWidth: number;
    anticlockwise: boolean;
}

/**
 * Context builder for health arc overlays.
 */
export class HealthArcContextBuilder implements OverlayContextBuilder<HealthArcContextOptions> {
    buildContext(
        token: Token,
        overlayDefinition: OverlayDefinition,
        options: HealthArcContextOptions
    ): OverlayRenderContext {

        return {
            overlayTypeId: 'health-arc',
            renderLayer: overlayDefinition.renderLayer,
            renderOnTokenMesh: overlayDefinition.renderOnTokenMesh,
            zIndex: overlayDefinition.zIndex,
            ...(overlayDefinition.styling && { styling: overlayDefinition.styling }),
            overlayCentre: {
                x: token.centre.x,
                y: token.centre.y
            },
            token: {
                id: token.id,
                name: token.name,
                position: {
                    x: token.position.x,
                    y: token.position.y
                },
                width: token.width,
                height: token.height,
                centre: {
                    x: token.centre.x,
                    y: token.centre.y
                },
                radius: token.radius
            },
            healthInfo: {
                healthArcStartAngle: options.healthArcStartAngle,
                healthArcEndAngle: options.healthArcEndAngle,
                healthArcColour: options.healthArcColour,
                tempHealthArcStartAngle: options.tempHealthArcStartAngle,
                tempHealthArcEndAngle: options.tempHealthArcEndAngle,
                tempHealthArcColour: options.tempHealthArcColour,
                backgroundStartAngle: options.backgroundStartAngle,
                backgroundEndAngle: options.backgroundEndAngle,
                backgroundColour: options.backgroundColour,
                arcRadius: options.arcRadius,
                arcWidth: options.arcWidth,
                anticlockwise: options.anticlockwise
            },
            user: {
                isGM: options.isGM ?? false
            }
        };
    }
}
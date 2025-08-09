import type { OverlayRenderContext } from '../../domain/interfaces/OverlayRenderContext.js';

import * as PIXI from 'pixi.js';
import { MODULE_ID } from '../../config.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { RenderingUtility } from '../utils/RenderingUtility.js';
import { Scaler } from '../utils/Scaler.js';

export class HealthArcRenderer {
  private readonly logger: FoundryLogger;

  constructor() {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthArcRenderer`);
  }

  /**
   * Render health arc into the provided graphics object
   */
  render(graphics: PIXI.Graphics, context: OverlayRenderContext): void {

    graphics.clear();

    if (!context.healthInfo) {
      this.logger.warn('No health info provided in context');
      return;
    }

    const healthInfo = context.healthInfo;
    const radius = context.token.radius + Math.round(Scaler.scaleLinear(healthInfo.arcRadius - context.token.radius));
    const arcWidth = Math.round(Scaler.scaleLinear(healthInfo.arcWidth));

    const backgroundArcStartRadians = (healthInfo.backgroundStartAngle * Math.PI) / 180;
    const backgroundArcEndRadians = (healthInfo.backgroundEndAngle * Math.PI) / 180;
    const healthArcStartRadians = (healthInfo.healthArcStartAngle * Math.PI) / 180;
    const healthArcEndRadians = (healthInfo.healthArcEndAngle * Math.PI) / 180;
    const tempHealthArcStartRadians = (healthInfo.tempHealthArcStartAngle * Math.PI) / 180;
    const tempHealthArcEndRadians = (healthInfo.tempHealthArcEndAngle * Math.PI) / 180;

    // Render background arc
    if (Math.abs(backgroundArcEndRadians - backgroundArcStartRadians) > 0.001) {
      graphics.beginFill(0, 0);
      const backgroundColour = RenderingUtility.transformColour(healthInfo.backgroundColour);
      graphics.lineStyle({
        width: arcWidth,
        color: backgroundColour,
        alpha: 0.5,
        cap: PIXI.LINE_CAP.BUTT
      });

      graphics.arc(0, 0, radius, backgroundArcStartRadians, backgroundArcEndRadians, healthInfo.anticlockwise);
      graphics.endFill();
    }

    if (Math.abs(healthArcEndRadians - healthArcStartRadians) > 0.001) {
      const lowColour = RenderingUtility.transformColour(healthInfo.lowHealthArcColour);
      const midColour = RenderingUtility.transformColour(healthInfo.midHealthArcColour);
      const highColour = RenderingUtility.transformColour(healthInfo.highHealthArcColour);

      const healthPercentage = healthInfo.healthPercentage ?? 0;
      
      RenderingUtility.renderGradientArc(
        graphics,
        healthArcStartRadians,
        healthArcEndRadians,
        radius,
        arcWidth,
        lowColour,
        midColour,
        highColour,
        healthPercentage,
        healthInfo.anticlockwise
      );
    }


    if (Math.abs(tempHealthArcEndRadians - tempHealthArcStartRadians) > 0.001) {
      graphics.beginFill(0, 0);
      const tempHealthColour = RenderingUtility.transformColour(healthInfo.tempHealthArcColour);
      graphics.lineStyle({
        width: arcWidth,
        color: tempHealthColour,
        alpha: 0.8,
        cap: PIXI.LINE_CAP.BUTT
      });

      graphics.arc(0, 0, radius, tempHealthArcStartRadians, tempHealthArcEndRadians, healthInfo.anticlockwise);
      graphics.endFill();
    }

    this.logger.debug('Rendered health arc', {
      radius,
      arcWidth,
      anticlockwise: healthInfo.anticlockwise,
      healthPercentage: healthInfo.healthPercentage,
      healthInfo
    });
  }
}
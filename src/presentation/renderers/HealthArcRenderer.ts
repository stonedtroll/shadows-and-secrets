import type { OverlayRenderContext } from '../../domain/interfaces/OverlayRenderContext.js';

import * as PIXI from 'pixi.js';
import { MODULE_ID } from '../../config.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { RenderingUtils } from '../utils/RenderingUtils.js';

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
    const radius = context.healthInfo.arcRadius;
    const arcWidth = healthInfo.arcWidth;

    const backgroundStartAngle = (healthInfo.backgroundStartAngle * Math.PI) / 180;
    const backgroundEndAngle = (healthInfo.backgroundEndAngle * Math.PI) / 180;
    const healthStartAngle = (healthInfo.healthArcStartAngle * Math.PI) / 180;
    const healthEndAngle = (healthInfo.healthArcEndAngle * Math.PI) / 180;
    const tempHealthStartAngle = (healthInfo.tempHealthArcStartAngle * Math.PI) / 180;
    const tempHealthEndAngle = (healthInfo.tempHealthArcEndAngle * Math.PI) / 180;

    // Render background arc
    if (Math.abs(backgroundEndAngle - backgroundStartAngle) > 0.001) {
      graphics.beginFill(0, 0);
      const backgroundColour = RenderingUtils.transformColour(healthInfo.backgroundColour);
      graphics.lineStyle({
        width: arcWidth,
        color: backgroundColour,
        alpha: 0.5,
        cap: PIXI.LINE_CAP.BUTT
      });

      graphics.arc(0, 0, radius, backgroundStartAngle, backgroundEndAngle, healthInfo.anticlockwise);
      graphics.endFill();
    }

    if (Math.abs(healthEndAngle - healthStartAngle) > 0.001) {
      graphics.beginFill(0, 0);
      const healthColour = RenderingUtils.transformColour(healthInfo.healthArcColour);
      graphics.lineStyle({
        width: arcWidth,
        color: healthColour,
        alpha: 1,
        cap: PIXI.LINE_CAP.BUTT
      });

      graphics.arc(0, 0, radius, healthStartAngle, healthEndAngle, healthInfo.anticlockwise);
      graphics.endFill();
    }

    if (Math.abs(tempHealthEndAngle - tempHealthStartAngle) > 0.001) {
      graphics.beginFill(0, 0);
      const tempHealthColour = RenderingUtils.transformColour(healthInfo.tempHealthArcColour);
      graphics.lineStyle({
        width: arcWidth,
        color: tempHealthColour,
        alpha: 0.8,
        cap: PIXI.LINE_CAP.BUTT
      });
      
      graphics.arc(0, 0, radius, tempHealthStartAngle, tempHealthEndAngle, healthInfo.anticlockwise);
      graphics.endFill();
    }

    this.logger.debug('Rendered health arc', {
      radius,
      arcWidth,
      anticlockwise: healthInfo.anticlockwise,
      backgroundAngles: {
        start: healthInfo.backgroundStartAngle,
        end: healthInfo.backgroundEndAngle,
        diff: healthInfo.backgroundEndAngle - healthInfo.backgroundStartAngle
      },
      healthAngles: {
        start: healthInfo.healthArcStartAngle,
        end: healthInfo.healthArcEndAngle,
        diff: healthInfo.healthArcEndAngle - healthInfo.healthArcStartAngle
      },
      tempHealthAngles: {
        start: healthInfo.tempHealthArcStartAngle,
        end: healthInfo.tempHealthArcEndAngle,
        diff: healthInfo.tempHealthArcEndAngle - healthInfo.tempHealthArcStartAngle
      }
    });
  }
}
import { MODULE_ID } from '../../config.js';
import { GridAdapter } from '../adapters/GridAdapter.js';
import { Grid } from '../../domain/value-objects/Grid.js';

import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

/**
 * Repository for accessing grid information from Foundry VTT
 */
export class GridRepository {
  private readonly logger: FoundryLogger;

  constructor() {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.GridRepository`);
  }

  getCurrentGrid(): Grid | null {
    if (!canvas?.ready || !canvas?.scene) {
      this.logger.debug('Canvas not ready or no scene active');
      return null;
    }

    const gridAdapter = new GridAdapter(canvas.grid);
    const grid = new Grid(gridAdapter);

    return grid;
  }
}
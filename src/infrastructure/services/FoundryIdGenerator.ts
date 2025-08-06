import type { IdGenerator } from '../../domain/services/IdGenerator.js';

/**
 * Foundry VTT implementation of the IdGenerator interface.
 */
export class FoundryIdGenerator implements IdGenerator {
  generate(): string {
    return foundry.utils.randomID();
  }
}
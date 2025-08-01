/**
 * Repository for accessing and transforming user data from Foundry VTT.
 */

import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { User } from '../../domain/entities/User.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { UserAdapter } from '../adapters/UserAdapter.js';

export class UserRepository {
  private readonly logger: FoundryLogger;

  constructor() {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.UserRepository`);
  }

  /**
   * Gets the current user.
   */
  getCurrentUser(): User | null {
    if (!game?.user) {
      this.logger.debug('Game user not available');
      return null;
    }

    return new User(new UserAdapter(game.user));
  }

  /**
   * Validates that the game and user are ready.
   */
  isReady(): boolean {
    return Boolean(game?.ready && game?.user);
  }
}
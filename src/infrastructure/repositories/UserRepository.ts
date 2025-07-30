/**
 * Repository for accessing and transforming user data from Foundry VTT.
 */

import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

/**
 * User context type for event data.
 */
export interface UserContext {
  isGM: boolean;
  id: string;
  colour: string;
}

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

    return game.user;
  }

  /**
   * Creates a user context object for the current user.
   */
  getCurrentUserContext(): UserContext {
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('Current user not available');
    }

    if (!user.id) {
      throw new Error('Current user ID not available');
    }

    return {
      isGM: user.isGM,
      id: user.id,
      colour: this.convertColourToHex(user.color)
    };
  }

  /**
   * Checks if the current user is a GM.
   */
  isCurrentUserGM(): boolean {
    return this.getCurrentUser()?.isGM ?? false;
  }

  /**
   * Gets the current user's ID.
   */
  getCurrentUserId(): string | null {
    return this.getCurrentUser()?.id ?? null;
  }

  /**
   * Gets the current user's colour as hex string.
   */
  getCurrentUserColour(): string | null {
    const user = this.getCurrentUser();
    if (!user) {
      return null;
    }

    return this.convertColourToHex(user.color);
  }

  /**
   * Gets all users in the game.
   */
  getAllUsers(): User[] {
    if (!game?.users) {
      this.logger.debug('Game users collection not ready');
      return [];
    }

    return game.users.contents;
  }

  /**
   * Gets all active users (currently connected).
   */
  getActiveUsers(): User[] {
    return this.getAllUsers().filter(user => user.active);
  }

  /**
   * Gets a specific user by ID.
   */
  getById(userId: string): User | undefined {
    if (!game?.users) {
      return undefined;
    }

    return game.users.get(userId);
  }

  /**
   * Checks if a user has permission for a specific action.
   */
  hasPermission(userId: string, permission: keyof typeof CONST.USER_PERMISSIONS): boolean {
    const user = this.getById(userId);
    if (!user) {
      return false;
    }

    return user.hasPermission(permission);
  }

  /**
   * Converts a colour value to hex string format.
   */
  private convertColourToHex(colour: string | number): string {
    if (typeof colour === 'string') {
      // Remove # if present and ensure 6 digits
      return colour.replace('#', '').padStart(6, '0');
    }

    // Convert number to hex and pad to 6 digits
    return colour.toString(16).padStart(6, '0');
  }

  /**
   * Validates that the game and user are ready.
   */
  isReady(): boolean {
    return Boolean(game?.ready && game?.user);
  }
}
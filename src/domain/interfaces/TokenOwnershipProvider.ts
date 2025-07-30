import type { TokenId, UserId } from './SightlineTypes.js';

/**
 * Service for querying token ownership and control relationships
 */
export interface TokenOwnershipProvider {
  /**
   * Get all token IDs owned by a specific user
   * Ownership typically means the user has full permissions on the token's actor
   */
  getOwnedTokenIds(userId: UserId): string[];
  
  /**
   * Check if a user owns a specific token
   */
  isOwner(userId: UserId, tokenId: TokenId): boolean;
  
  /**
   * Get all token IDs currently controlled by a user
   * Control is typically temporary (selected tokens)
   */
  getControlledTokenIds(userId: UserId): string[];
  
  /**
   * Check if a user has control of a specific token
   */
  hasControl(userId: UserId, tokenId: TokenId): boolean;
  
  /**
   * Check if a token is considered an ally to the user
   * This may consider factors like disposition, ownership, or faction
   */
  isAlly(userId: UserId, tokenId: TokenId): boolean;
}
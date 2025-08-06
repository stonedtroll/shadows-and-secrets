/**
 * Domain service interface for generating unique identifiers.
 */
export interface IdGenerator {
  
  /**
   * Generate a unique identifier
   */
  generate(): string;
}
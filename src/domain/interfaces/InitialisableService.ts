/**
 * Interface for services that require initialisation
 */
export interface InitialisableService {
  /**
   * Initialise the service
   */
  initialise(): void | Promise<void>;
  
  /**
   * Optional: Clean up the service
   */
  tearDown?(): void | Promise<void>;
}
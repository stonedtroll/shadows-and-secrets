import type { IdGenerator } from '../services/IdGenerator.js';

/**
 * Base class for all domain events in the system.
 * Domain events represent something that has happened in the domain.
 */
export abstract class AbstractDomainEvent<T> {
  public readonly id: string;
  public readonly occurredAt: number; 
  protected readonly props: T;
  
  /**
   * The name of the event, used for event routing and handling
   */
  static eventName: string;
  
  private static idGenerator: IdGenerator;

  /**
   * Configure the ID generator for all domain events.
   * Must be called once during application startup.
   */
  static configureIdGenerator(generator: IdGenerator): void {
    AbstractDomainEvent.idGenerator = generator;
  }

  constructor(props: T) {
    if (!AbstractDomainEvent.idGenerator) {
      throw new Error('IdGenerator not configured. Call AbstractDomainEvent.configureIdGenerator() during startup.');
    }
    
    this.id = AbstractDomainEvent.idGenerator.generate();
    this.occurredAt = Date.now(); 
    this.props = Object.freeze(props);
  }

  /**
   * Get the name of this event type
   */
  get eventName(): string {
    return (this.constructor as typeof AbstractDomainEvent).eventName;
  }

  /**
   * Get the event payload
   */
  get payload(): Readonly<T> {
    return this.props;
  }

  /**
   * Serialise the event for storage or transmission
   */
  toJSON(): object {
    return {
      id: this.id,
      eventName: this.eventName,
      occurredAt: this.occurredAt,
      payload: this.props
    };
  }
}
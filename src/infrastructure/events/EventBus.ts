/**
 * Type-safe event bus for publish-subscribe pattern
 * Provides decoupled communication between components.
 */
import { createFoundryLogger, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import type { EventMap } from './EventMap.js';

export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type EventData = any;

export class EventBus {
  private readonly logger: FoundryLogger;
  private readonly listeners = new Map<keyof EventMap, Set<EventHandler>>();
  private readonly onceListeners = new Map<keyof EventMap, Set<EventHandler>>();
  
  constructor() {
    this.logger = createFoundryLogger(`${MODULE_ID}.EventBus`);
    this.logger.debug('Initialising EventBus');
  }

  /**
   * Subscribe to an event with type safety
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.logger.debug(`Listener added for event: ${String(event)}`);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
      this.logger.debug(`Listener removed for event: ${String(event)}`);
    }
  }

  /**
   * Subscribe to an event once with type safety
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>
  ): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler);
    this.logger.debug(`Once listener added for event: ${String(event)}`);
  }

  /**
   * Emit an event with type safety
   * Uses conditional types to handle void events without data parameter
   */
  async emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [data: EventMap[K]]
  ): Promise<void> {
    const data = args[0] as EventMap[K];
    const handlers = this.listeners.get(event);
    const onceHandlers = this.onceListeners.get(event);
    
    const promises: Promise<void>[] = [];
    
    if (handlers) {
      this.logger.debug(`Emitting event: ${String(event)}`, { data });
      handlers.forEach(handler => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result.catch(error => {
              this.logger.error(`Error in async handler for event ${String(event)}:`, error);
            }));
          }
        } catch (error) {
          this.logger.error(`Error in handler for event ${String(event)}:`, error);
        }
      });
    }
    
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result.catch(error => {
              this.logger.error(`Error in async once handler for event ${String(event)}:`, error);
            }));
          }
        } catch (error) {
          this.logger.error(`Error in once handler for event ${String(event)}:`, error);
        }
      });
      // Clear once handlers
      this.onceListeners.delete(event);
    }
    
    await Promise.all(promises);
  }

  /**
   * Clear all listeners for an event or all events
   */
  clear(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      this.logger.debug(`Cleared all listeners for event: ${String(event)}`);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      this.logger.debug('Cleared all event listeners');
    }
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(event?: keyof EventMap): number {
    if (event) {
      const regular = this.listeners.get(event)?.size ?? 0;
      const once = this.onceListeners.get(event)?.size ?? 0;
      return regular + once;
    }
    
    let count = 0;
    this.listeners.forEach(set => count += set.size);
    this.onceListeners.forEach(set => count += set.size);
    return count;
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event: keyof EventMap): boolean {
    return (this.listeners.has(event) && this.listeners.get(event)!.size > 0) ||
           (this.onceListeners.has(event) && this.onceListeners.get(event)!.size > 0);
  }

  /**
   * Clean up resources
   */
  tearDown(): void {
    this.clear();
    this.logger.debug('EventBus torn down');
  }
}
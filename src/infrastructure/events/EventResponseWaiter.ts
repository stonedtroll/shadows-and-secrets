import type { EventBus } from './EventBus.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

interface ResponseWaiterOptions {
  timeoutMs?: number;
  correlationKey?: string;
}

export class EventResponseWaiter {
  private readonly logger: FoundryLogger;
  
  constructor(private readonly eventBus: EventBus) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.EventResponseWaiter`);
  }

  /**
   * Emits an event and waits for a correlated response.
   * Optimised for performance with automatic cleanup.
   */
  async waitForResponse<TRequest, TResponse>(
    requestEvent: string,
    responseEvent: string,
    requestData: TRequest,
    options: ResponseWaiterOptions = {}
  ): Promise<TResponse> {
    const { timeoutMs = 5000, correlationKey = 'correlationId' } = options;
    const correlationId = `${requestEvent}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      let responseHandler: (data: any) => void;
      let timeoutId: number;
      
      // Setup response handler
      responseHandler = (data: any) => {
        if (data[correlationKey] === correlationId) {
          clearTimeout(timeoutId);
          this.eventBus.off(responseEvent, responseHandler);
          
          this.logger.debug('Response received', {
            correlationId,
            responseEvent,
            responseTime: Date.now()
          });
          
          resolve(data as TResponse);
        }
      };
      
      // Register listener
      this.eventBus.on(responseEvent, responseHandler);
      
      // Set timeout
      timeoutId = window.setTimeout(() => {
        this.eventBus.off(responseEvent, responseHandler);
        
        this.logger.warn('Response timeout', {
          correlationId,
          requestEvent,
          responseEvent,
          timeoutMs
        });
        
        reject(new Error(`Response timeout for ${responseEvent} after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Emit request with correlation ID
      const correlatedRequest = {
        ...requestData,
        [correlationKey]: correlationId
      };
      
      this.logger.debug('Emitting correlated request', {
        correlationId,
        requestEvent,
        expectedResponse: responseEvent
      });
      
      this.eventBus.emit(requestEvent, correlatedRequest);
    });
  }

  /**
   * Creates a response handler that automatically correlates with requests.
   */
  createResponseHandler<TRequest, TResponse>(
    requestEvent: string,
    handler: (request: TRequest) => TResponse | Promise<TResponse>,
    responseEvent: string,
    options: ResponseWaiterOptions = {}
  ): void {
    const { correlationKey = 'correlationId' } = options;
    
    this.eventBus.on(requestEvent, async (request: any) => {
      const correlationId = request[correlationKey];
      
      if (!correlationId) {
        this.logger.warn('Request missing correlation ID', { requestEvent });
        return;
      }
      
      try {
        const response = await handler(request);
        
        this.eventBus.emit(responseEvent, {
          ...response,
          [correlationKey]: correlationId
        });
      } catch (error) {
        this.logger.error('Error in response handler', {
          requestEvent,
          correlationId,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Emit error response
        this.eventBus.emit(responseEvent, {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
          [correlationKey]: correlationId
        });
      }
    });
  }
}
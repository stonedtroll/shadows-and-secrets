/**
 * Orchestrates token movement operations and coordinates movement-based overlay updates. This coordinator acts as the bridge
 * between token position changes and the application's response, including collision
 * detection, snapping behaviour, and overlay display updates.
 * 
 * Features:
 * - Intelligent collision detection during movement
 * - Automatic snapping to valid positions
 * - Movement validation through domain services
 */

import type { TokenUpdateEvent } from '../../infrastructure/events/FoundryEvents.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import type { MoveTokenCommandOptions } from '../types/CommandOptions';

import { Token } from '../../domain/entities/Token.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { MoveTokenCommand } from '../commands/MoveTokenCommand.js';
import { MovementValidator } from '../../domain/services/MovementValidator.js';
import { CommandExecutor } from '../commands/CommandExecutor.js';
import { Vector3 } from '../../domain/value-objects/Vector3.js';
import { SnapPositionCalculator } from '../../domain/services/SnapPositionCalculator.js';
import { MoveResult } from '../types/MoveResult.js';

export class TokenMovementCoordinator {
  private readonly logger: FoundryLogger;

  /**
   * Default options for movement commands.
   */
  private static readonly DEFAULT_MOVE_OPTIONS: MoveTokenCommandOptions = {
    enableSnapping: true
  };

  constructor(
    private readonly commandExecutor: CommandExecutor,
    private readonly movementValidator: MovementValidator,
    private readonly snapCalculator: SnapPositionCalculator,
    private readonly eventBus: EventBus
  ) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.TokenMovementCoordinator`);

    this.registerEventHandlers();

    this.logger.info('TokenMovementCoordinator initialised');
  }

  /**
   * Handles token update events for position changes.
   * Processes movement validation, collision detection, and snapping.
   */
  async handleTokenUpdate(event: TokenUpdateEvent): Promise<void> {


  }

  /**
   * Registers event handlers for token updates.
   */
  private registerEventHandlers(): void {
    this.eventBus.on('token:update', this.handleTokenUpdate.bind(this));

    this.logger.debug('Token update event handler registered');
  }

  /**
   * Checks if the update event contains position changes.
   */
  private hasPositionChanged(changes: Partial<TokenUpdateEvent['changes']>): boolean {
    return 'x' in changes || 'y' in changes;
  }

  /**
   * Calculates the target position from state changes.
   */
  private determineEndPosition(
    updatingToken: Token,
    changes: Partial<TokenUpdateEvent['changes']>
  ): Vector3 {
    return new Vector3(
      changes.x ?? updatingToken.position.x,
      changes.y ?? updatingToken.position.y,
      changes.elevation ?? updatingToken.elevation ?? 0
    );
  }

  /**
   * Checks if two positions are the same.
   */
  private isSamePosition(
    startPosition: Vector3,
    endPosition: Vector3
  ): boolean {
    return endPosition.x === startPosition.x &&
      endPosition.y === startPosition.y;
  }

  /**
   * Executes the movement command with validation and snapping.
   */
  private async executeMovement(
    updatingToken: Token,
    endPosition: Vector3,
    allTokens: Token[]
  ) {
    const command = new MoveTokenCommand(
      updatingToken,
      endPosition,
      allTokens,
      TokenMovementCoordinator.DEFAULT_MOVE_OPTIONS,
      this.movementValidator,
      this.snapCalculator
    );

    const result = await this.commandExecutor.execute(command);

    this.logger.debug('Move command executed', {
      success: result.success,
      newPosition: result.newPosition,
      previousPosition: result.previousPosition,
      snapTargetId: result.snapTargetId,
      snapTargetName: result.snapTargetName,
      distance: result.distance,
      isSnapped: result.isSnapped
    });

    return result;
  }

  /**
   * Emits movement event based on command result.
   */
  private async emitMovementEvent(
    updatingToken: Token,
    moveResult: MoveResult
  ): Promise<void> {

    this.logger.debug('Emitting token movement event', {
      tokenId: updatingToken.id,
      newPosition: moveResult.newPosition,
      updatingToken: updatingToken,
      moveResult: moveResult
    });

    // Build base payload with guaranteed values
    const basePayload = {
      tokenId: updatingToken.id,
      tokenName: updatingToken.name,
      fromPosition: moveResult.previousPosition ?? {
        x: updatingToken.position.x,
        y: updatingToken.position.y
      },
      toPosition: moveResult.newPosition ?? {
        x: updatingToken.position.x,
        y: updatingToken.position.y
      },
      isSnapped: moveResult.isSnapped ?? false,
      distance: moveResult.distance ?? 0
    };

    // Add snap target if present
    const eventPayload = {
      ...basePayload,
      ...(moveResult.snapTargetId && moveResult.snapTargetName && {
        snapTarget: {
          id: moveResult.snapTargetId,
          name: moveResult.snapTargetName
        }
      })
    };

    // Emit based on result - preserving current logic
    if (moveResult.success && moveResult.newPosition && moveResult.isSnapped) {
      await this.eventBus.emit('token.moved', eventPayload);
    } else if (!moveResult.success) {
      // Preserve current behaviour: emit 'token.moved' even on failure
      await this.eventBus.emit('token.moved', {
        ...eventPayload,
        fromPosition: moveResult.previousPosition ?? {
          x: updatingToken.position.x,
          y: updatingToken.position.y
        },
        toPosition: moveResult.newPosition ?? {
          x: updatingToken.position.x,
          y: updatingToken.position.y
        },
        isSnapped: false
      });
    } else {
      this.logger.debug('No blockers', { moveResult });
    }
  }
}

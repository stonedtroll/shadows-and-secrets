/**
 * Centralised keyboard event handling service.
 */
import type { EventBus } from '../events/EventBus.js';
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import type {
  KeyboardKeyDownEvent,
  KeyboardKeyUpEvent
} from '../events/FoundryEvents.js';

import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { TokenRepository } from '../repositories/TokenRepository.js';
import { ActorRepository } from '../repositories/ActorRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';

export class KeyboardHandler {

  private readonly logger: FoundryLogger;
  private readonly eventBus: EventBus;
  private readonly tokenRepository: TokenRepository;
  private readonly actorRepository: ActorRepository;
  private readonly userRepository: UserRepository;

  private readonly activeKeys = new Set<string>();
  private readonly modifierState = {
    shift: false,
    ctrl: false,
    alt: false,
    meta: false
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.KeyboardHandler`);
    this.tokenRepository = new TokenRepository();
    this.actorRepository = new ActorRepository(this.tokenRepository);
    this.userRepository = new UserRepository();
  }

  /**
   * Tears down the keyboard handler by removing all event listeners.
   * Clears internal state to prevent memory leaks.
   */
  async tearDown(): Promise<void> {
    this.activeKeys.clear();

    this.logger.info('Keyboard handler torn down');
  }

  // Private Methods - Event Emission

  /**
   * Emits keyboard key down event with game context.
   */
  private emitKeyboardKeyDownEvent(key: string, code: string): void {
    if (!this.validateGameState()) {
      return;
    }

    const keyDownEvent: KeyboardKeyDownEvent = {
      key,
      code,
      modifiers: { ...this.modifierState },
      timestamp: Date.now(),
      user: this.userRepository.getCurrentUserContext(),
      allTokenAdapters: this.tokenRepository.getAllAsAdapters(),
      ownedByCurrentUserActorAdapters: this.actorRepository.getFromOwnedTokensAsAdapters(),
    };

    this.logger.debug(`Key pressed`, {
      key: keyDownEvent.key,
      code: keyDownEvent.code,
      modifiers: keyDownEvent.modifiers,
      timestamp: keyDownEvent.timestamp,
      user: keyDownEvent.user,
    });

    this.eventBus.emit('keyboard:keyDown', keyDownEvent);
  }

  /**
   * Emits keyboard key up event.
   */
  private emitKeyboardKeyUpEvent(key: string, code: string): void {
    if (!this.validateGameState()) {
      return;
    }

    const keyUpEvent: KeyboardKeyUpEvent = {
      key,
      code,
      modifiers: { ...this.modifierState },
      timestamp: Date.now(),
      user: this.userRepository.getCurrentUserContext(),
    };

    this.logger.debug(`Key released`, {
      key: keyUpEvent.key,
      code: keyUpEvent.code,
      modifiers: keyUpEvent.modifiers,
      timestamp: keyUpEvent.timestamp,
      user: keyUpEvent.user,
    });

    this.eventBus.emit('keyboard:keyUp', keyUpEvent);
  }

  // Private Methods - Keybinding Registration

  /**
   * Registers module keybindings with Foundry VTT.
   * Must be called during the init hook as per Foundry v13 requirements.
   */
   registerKeybindings(): void {
    this.logger.info('Registering keybindings');

    if (!game.keybindings) {
      this.logger.error('Keybindings API not available');
      return;
    }

    try {
      game.keybindings.register(MODULE_ID, 'toggleOverlay', {
        name: `${MODULE_ID}.keybindings.toggleOverlay.name`,
        hint: `${MODULE_ID}.keybindings.toggleOverlay.hint`,
        editable: [{
          key: 'KeyM',
          modifiers: []
        }],
        onDown: () => {
          // Check if handler is fully initialised before emitting
          if (this.activeKeys && this.eventBus) {
            this.emitKeyboardKeyDownEvent('m', 'KeyM');
          }
        },
        onUp: () => {
          // Check if handler is fully initialised before emitting
          if (this.activeKeys && this.eventBus) {
            this.emitKeyboardKeyUpEvent('m', 'KeyM');
          }
        },
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
      });

      this.logger.info('Keybindings registered successfully');
    } catch (error) {
      this.logger.error('Failed to register keybindings', error);
    }
  }

  /**
   * Validates that the game is in a valid state for processing events.
   */
  private validateGameState(): boolean {
    if (!this.userRepository.isReady()) {
      this.logger.warn('Game or user not ready, skipping keyboard event');
      return false;
    }

    return true;
  }
}
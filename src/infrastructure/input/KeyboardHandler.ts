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
import { UserRepository } from '../repositories/UserRepository.js';

export class KeyboardHandler {

  private readonly logger: FoundryLogger;
  private readonly eventBus: EventBus;
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
      timestamp: Date.now()
    };

    this.logger.debug(`Key pressed`, {
      key: keyDownEvent.key,
      code: keyDownEvent.code,
      modifiers: keyDownEvent.modifiers,
      timestamp: keyDownEvent.timestamp
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
      timestamp: Date.now()
    };

    this.logger.debug(`Key released`, {
      key: keyUpEvent.key,
      code: keyUpEvent.code,
      modifiers: keyUpEvent.modifiers,
      timestamp: keyUpEvent.timestamp
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
      // Register M key for health overlays
      game.keybindings.register(MODULE_ID, 'toggleHealthOverlay', {
        name: `${MODULE_ID}.keybindings.toggleHealthOverlay.name`,
        hint: `${MODULE_ID}.keybindings.toggleHealthOverlay.hint`,
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

      // Register K key for token info overlays
      game.keybindings.register(MODULE_ID, 'toggleTokenInfo', {
        name: `${MODULE_ID}.keybindings.toggleTokenInfo.name`,
        hint: `${MODULE_ID}.keybindings.toggleTokenInfo.hint`,
        editable: [{
          key: 'KeyK',
          modifiers: []
        }],
        onDown: () => {
          // Check if handler is fully initialised before emitting
          if (this.activeKeys && this.eventBus) {
            this.emitKeyboardKeyDownEvent('k', 'KeyK');
          }
        },
        onUp: () => {
          // Check if handler is fully initialised before emitting
          if (this.activeKeys && this.eventBus) {
            this.emitKeyboardKeyUpEvent('k', 'KeyK');
          }
        },
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
      });

      this.logger.info('Keybindings registered successfully', {
        registeredKeys: ['KeyM', 'KeyK'],
        bindings: ['toggleHealthOverlay', 'toggleTokenInfo']
      });
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
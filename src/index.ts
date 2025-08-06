/**
 * Shadows & Secrets Module
 */

import type { ShadowsAndSecretsApplication } from './application/ShadowsAndSecretsApplication.js';
import type { OverlayRegistry } from './application/registries/OverlayRegistry.js';
import type { EventBus } from './infrastructure/events/EventBus.js';
import type { KeyboardHandler } from './infrastructure/input/KeyboardHandler.js';

import { MODULE_ID, SETTINGS } from './config.js';
import { DIContainer } from './infrastructure/di/DIContainer.js';
import { registerSettings, getLogLevelFromString } from './settings.js';
import { LogLevel, LoggerFactory, SolarisedColours, type FoundryLogger } from '../lib/log4foundry/log4foundry.js';

const moduleState = {
  logger: null as FoundryLogger | null,
  container: null as DIContainer | null,
  application: null as ShadowsAndSecretsApplication | null,
  isInitialised: false,
  isReady: false
};

// Module lifecycle hooks with error boundary
Hooks.once('init', async () => {
  try {
    await initialiseModule();
  } catch (error) {
    console.error(`${MODULE_ID} | Critical initialisation error:`, error);
    ui.notifications?.error('Shadows & Secrets failed to initialise');
  }
});

Hooks.once('ready', async () => {
  try {
    await startApplication();
  } catch (error) {
    console.error(`${MODULE_ID} | Critical startup error:`, error);
    ui.notifications?.error('Shadows & Secrets failed to start');
  }
});

/**
 * Initialise the module during Foundry's init phase
 * Sets up logging, settings, and dependency injection
 */
async function initialiseModule(): Promise<void> {
  console.log(`${MODULE_ID} | Initialising Shadows & Secrets`);

  // Register module settings first
  registerSettings();
  
  // Configure logging based on saved settings
  const logLevel = getConfiguredLogLevel();
  moduleState.logger = configureLogging(logLevel);

  // Create and initialise dependency container
  moduleState.container = new DIContainer();
  
  try {
    await moduleState.container.initialise();
    moduleState.isInitialised = true;
    
    const keyboardHandler = moduleState.container.get<KeyboardHandler>('keyboardHandler');
    if (keyboardHandler) {
      keyboardHandler.registerKeybindings();
      moduleState.logger.debug('Keybindings registered during init');
    } else {
      moduleState.logger.warn('KeyboardHandler not available for keybinding registration');
    }
    
    moduleState.logger.info('Module initialisation complete');
    moduleState.logger.info(`Log level set to: ${LogLevel[logLevel]}`);
    moduleState.logger.debug('Debug logging is active');
    
  } catch (error) {
    moduleState.logger?.error('Failed to initialise dependency container', error);
    ui.notifications?.error('Failed to initialise Shadows & Secrets');
    throw error; // Re-throw to prevent further execution
  }
}

/**
 * Start the application when Foundry is ready
 * Creates the main application and enables debug mode if configured
 */
async function startApplication(): Promise<void> {
  if (!moduleState.isInitialised || !moduleState.logger || !moduleState.container) {
    console.error(`${MODULE_ID} | Cannot start application - module not properly initialised`);
    ui.notifications?.error('Shadows & Secrets not properly initialised');
    return;
  }

  moduleState.logger.info('Game ready, setting up Shadows & Secrets');

  try {
    // Create and initialise the application
    moduleState.application = moduleState.container.createApplication();
    await moduleState.application.initialise();
    
    // Enable debug mode if log level is DEBUG
    if (isDebugMode()) {
      enableDebugMode();
    }
    
    moduleState.isReady = true;
    moduleState.logger.info('Shadows & Secrets setup complete');

  } catch (error) {
    moduleState.logger.error('Failed to initialise Shadows & Secrets Application', error);
    ui.notifications?.error('Failed to start Shadows & Secrets');
    throw error;
  }
}

/**
 * Clean up resources when closing the game
 * Ensures proper teardown of application and container
 * Optimised for clean shutdown without memory leaks
 */
async function teardownModule(): Promise<void> {
  if (moduleState.logger) {
    moduleState.logger.info('Closing game, tearing down Shadows & Secrets');
  }
  
  try {
    if (moduleState.application) {
      await moduleState.application.tearDown();
      moduleState.application = null;
    }
    
    if (moduleState.container) {
      await moduleState.container.shutdown();
      moduleState.container = null;
    }
    
    // Clean up debug objects
    if ((window as any).shadowsAndSecretsDebug) {
      delete (window as any).shadowsAndSecretsDebug;
    }
    
    // Reset state
    moduleState.isInitialised = false;
    moduleState.isReady = false;
    
    if (moduleState.logger) {
      moduleState.logger.info('Shadows & Secrets teardown complete');
      moduleState.logger = null;
    }
    
  } catch (error) {
    console.error(`${MODULE_ID} | Error during teardown:`, error);
  }
}

/**
 * Get the configured log level from settings
 * Defaults to INFO if not set or if game not ready
 * Optimised with safe fallback for early access
 */
function getConfiguredLogLevel(): LogLevel {
  try {
    if (game?.settings) {
      const savedLogLevel = game.settings.get(MODULE_ID, SETTINGS.LOG_LEVEL) as string;
      return savedLogLevel ? getLogLevelFromString(savedLogLevel) : LogLevel.INFO;
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not read log level setting, using INFO`);
  }
  
  return LogLevel.INFO;
}

/**
 * Configure the logging system with the specified level
 * Returns the configured logger instance
 * Optimised for Foundry VTT v13 logging patterns
 */
function configureLogging(logLevel: LogLevel): FoundryLogger {
  const factory = LoggerFactory.getInstance();
  factory.setDefaultLevel(logLevel);
  factory.setDefaultColour(SolarisedColours.BLUE);

  return factory.getFoundryLogger(MODULE_ID, {
    level: logLevel,
    useFoundryPrefix: true
  });
}

/**
 * Check if the module is running in debug mode
 * Based on the configured log level with safe fallback
 * Optimised for performance with early return
 */
function isDebugMode(): boolean {
  try {
    const logLevel = getConfiguredLogLevel();
    return logLevel === LogLevel.DEBUG;
  } catch (error) {
    return false; // Safe fallback
  }
}

/**
 * Enable debug mode with development utilities
 * Exposes debug tools on the window object
 * Optimised for development workflow with Foundry VTT v13
 */
function enableDebugMode(): void {
  if (!moduleState.container || !moduleState.logger) {
    console.warn(`${MODULE_ID} | Cannot enable debug mode - dependencies not ready`);
    return;
  }

  try {
    const overlayRegistry = moduleState.container.get<OverlayRegistry>('overlayRegistry');
    const eventBus = moduleState.container.get<EventBus>('eventBus');

    (window as any).shadowsAndSecretsDebug = {
      // Core module components
      logger: () => moduleState.logger,
      container: () => moduleState.container,
      application: () => moduleState.application,
      
      // Debug utilities
      listOverlays: () => overlayRegistry?.getAll(),
      getOverlay: (id: string) => overlayRegistry?.get(id),
      eventBus: () => eventBus,
      
      // Diagnostic tools
      getStats: () => ({
        overlays: overlayRegistry?.getAll().length ?? 0,
        logLevel: LogLevel[getConfiguredLogLevel()],
        isInitialised: moduleState.isInitialised,
        isReady: moduleState.isReady
      }),

      // Development utilities
      reinitialise: async () => {
        console.log(`${MODULE_ID} | Reinitialising for development...`);
        await teardownModule();
        await initialiseModule();
        await startApplication();
        return 'Reinitialisation complete';
      }
    };

    console.log(`${MODULE_ID} | Debug mode enabled`);
    console.log('  Access debug tools via: window.shadowsAndSecretsDebug');
    console.log('  Available commands:');
    console.log('    - shadowsAndSecretsDebug.getAPI()');
    console.log('    - shadowsAndSecretsDebug.listOverlays()');
    console.log('    - shadowsAndSecretsDebug.getStats()');
    console.log('    - shadowsAndSecretsDebug.reinitialise()');
    
  } catch (error) {
    if (moduleState.logger) {
      moduleState.logger.error('Failed to enable debug mode', error);
    }
  }
}
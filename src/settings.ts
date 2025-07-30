import { MODULE_ID, SETTINGS } from './config.js';
import { LogLevel, LoggerFactory } from '../lib/log4foundry/log4foundry.js';

/**
 * Get localised log level choices
 */
export function getLogLevelChoices(): Record<string, string> {
  return {
    debug: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.debug`),
    info: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.info`),
    warn: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.warn`),
    error: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.error`),
    fatal: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.fatal`),
    none: game.i18n.localize(`${MODULE_ID}.settings.logLevel.choices.none`)
  };
}

/**
 * Convert string log level to LogLevel enum
 */
export function getLogLevelFromString(levelString: string): LogLevel {
  switch (levelString.toLowerCase()) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    case 'fatal':
      return LogLevel.FATAL;
    case 'none':
      return LogLevel.NONE;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Register module settings with performance optimisations
 */
export function registerSettings(): void {
  if (!game?.settings) {
    console.warn(`[${MODULE_ID}] Game settings not available during registration`);
    return;
  }

  try {
    game.settings.register(MODULE_ID, SETTINGS.LOG_LEVEL, {
      name: game.i18n.localize(`${MODULE_ID}.settings.logLevel.name`),
      hint: game.i18n.localize(`${MODULE_ID}.settings.logLevel.hint`),
      scope: 'client',
      config: true,
      type: String,
      choices: getLogLevelChoices(),
      default: 'info',
      onChange: (value: string) => {
        try {
          const localisedMessage = game.i18n.format(`${MODULE_ID}.notifications.logLevelChanged`, { level: value });
          console.log(`[${MODULE_ID}] ${localisedMessage}`);

          // Convert string level to LogLevel enum
          const level = getLogLevelFromString(value);

          // Update all loggers via the factory
          LoggerFactory.getInstance().setAllLogLevels(level);

          console.log(`[${MODULE_ID}] Logger updated successfully to ${LogLevel[level]}`);
        } catch (error) {
          console.error(`[${MODULE_ID}] Failed to update log level:`, error);
        }
      }
    });

    const successMessage = game.i18n.localize(`${MODULE_ID}.notifications.moduleInitialised`);
    console.log(`[${MODULE_ID}] ${successMessage}`);

  } catch (error) {
    console.error(`[${MODULE_ID}] Failed to register settings:`, error);
  }
}

/**
 * Get setting value 
 */
export function getSetting<T>(settingKey: string): T {
  try {
    return game.settings.get(MODULE_ID, settingKey) as T;
  } catch (error) {
    console.warn(`[${MODULE_ID}] Failed to get setting '${settingKey}', using default`);
    return getDefaultSettingValue(settingKey) as T;
  }
}

/**
 * Set setting value 
 */
export async function setSetting<T>(settingKey: string, value: T): Promise<void> {
  try {
    await game.settings.set(MODULE_ID, settingKey, value);
    const message = game.i18n.format(`${MODULE_ID}.notifications.settingChanged`, {
      setting: settingKey,
      value: String(value)
    });
    console.log(`[${MODULE_ID}] ${message}`);
  } catch (error) {
    const errorMessage = game.i18n.format(`${MODULE_ID}.notifications.settingFailed`, {
      setting: settingKey
    });
    console.error(`[${MODULE_ID}] ${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Get default setting values for fallback
 */
function getDefaultSettingValue(settingKey: string): unknown {
  const defaults: Record<string, unknown> = {
    [SETTINGS.LOG_LEVEL]: 'info',
  };

  return defaults[settingKey] ?? null;
}

/**
 * Check if a specific setting is enabled 
 */
export function isSettingEnabled(settingKey: string): boolean {
  return getSetting<boolean>(settingKey) ?? false;
}

/**
 * Batch get multiple settings
 */
export function getSettings<T extends Record<string, unknown>>(settingKeys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};

  for (const key of settingKeys) {
    try {
      result[key] = game.settings.get(MODULE_ID, key as string) as T[keyof T];
    } catch (error) {
      console.warn(`[${MODULE_ID}] Failed to get batch setting '${String(key)}'`);
      result[key] = getDefaultSettingValue(key as string) as T[keyof T];
    }
  }

  return result;
}
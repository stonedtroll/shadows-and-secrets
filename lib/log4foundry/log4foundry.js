var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["FATAL"] = 4] = "FATAL";
  LogLevel2[LogLevel2["NONE"] = 5] = "NONE";
  return LogLevel2;
})(LogLevel || {});
function getLogLevelName(level) {
  switch (level) {
    case 0:
      return "DEBUG";
    case 1:
      return "INFO";
    case 2:
      return "WARN";
    case 3:
      return "ERROR";
    case 4:
      return "FATAL";
    case 5:
      return "NONE";
    default:
      return `UNKNOWN(${level})`;
  }
}
class AbstractLogger {
  /**
   * Creates a new logger instance.
   * @param moduleId - The module identifier for this logger
   * @param options - Configuration options
   */
  constructor(moduleId, options = {}) {
    /**
     * The module identifier for this logger instance.
     */
    __publicField(this, "moduleId");
    /**
     * The current minimum log level for this logger.
     */
    __publicField(this, "level", LogLevel.INFO);
    /**
     * Whether to include timestamps in log output.
     */
    __publicField(this, "includeTimestamps");
    /**
     * Custom context to be included with all logs.
     */
    __publicField(this, "context");
    /**
     * Function to format timestamps.
     */
    __publicField(this, "timestampFormatter");
    this.moduleId = moduleId;
    this.level = options.level ?? LogLevel.INFO;
    this.includeTimestamps = options.includeTimestamps ?? true;
    this.context = options.context;
    this.timestampFormatter = options.timestampFormatter ?? this.defaultTimestampFormatter;
  }
  /**
   * Log a debug message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  debug(message, data) {
    return this.log(LogLevel.DEBUG, message, data);
  }
  /**
   * Log an info message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  info(message, data) {
    return this.log(LogLevel.INFO, message, data);
  }
  /**
   * Log a warning message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  warn(message, data) {
    return this.log(LogLevel.WARN, message, data);
  }
  /**
   * Log an error message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  error(message, data) {
    return this.log(LogLevel.ERROR, message, data);
  }
  /**
   * Log a fatal message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  fatal(message, data) {
    return this.log(LogLevel.FATAL, message, data);
  }
  /**
   * Log a message with a specific level.
   * @param level - The log level
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  log(level, message, data) {
    if (level < this.level) {
      return this;
    }
    const logMessage = {
      level,
      message,
      timestamp: /* @__PURE__ */ new Date(),
      moduleId: this.moduleId,
      data,
      context: this.context
    };
    this.processLogMessage(logMessage);
    return this;
  }
  /**
   * Convert a log level to its string representation.
   * @param level - The log level
   * @returns String representation of the log level
   */
  getLevelName(level) {
    return getLogLevelName(level);
  }
  /**
   * Default formatter for timestamps.
   * @param timestamp - The timestamp to format
   * @returns The formatted timestamp
   */
  defaultTimestampFormatter(timestamp) {
    const hours = timestamp.getHours().toString().padStart(2, "0");
    const minutes = timestamp.getMinutes().toString().padStart(2, "0");
    const seconds = timestamp.getSeconds().toString().padStart(2, "0");
    const milliseconds = timestamp.getMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
  /**
   * Set additional context that will be included with all logs.
   * @param context - Context object to include with logs
   * @returns The logger instance for method chaining
   */
  withContext(context) {
    this.context && Object.assign(this.context, context);
    return this;
  }
}
class ConsoleLogger extends AbstractLogger {
  /**
   * Creates a new ConsoleLogger instance.
   * @param moduleId - The module identifier for this logger
   * @param options - Configuration options for the logger
   */
  constructor(moduleId, options = {}) {
    super(moduleId, options);
  }
  /**
   * Process a log message by outputting to the console.
   * @param logMessage - The log message to process
   */
  processLogMessage(logMessage) {
    const { level, message, timestamp, moduleId, data } = logMessage;
    const formattedTimestamp = this.includeTimestamps ? `[${this.timestampFormatter(timestamp)}] ` : "";
    const levelName = this.getLevelName(level);
    const logParts = [];
    if (formattedTimestamp) {
      logParts.push(formattedTimestamp);
    }
    logParts.push(`[${moduleId}]`, `[${levelName}]`, message);
    const logString = logParts.join(" ");
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logString, data ?? "");
        break;
      case LogLevel.INFO:
        console.info(logString, data ?? "");
        break;
      case LogLevel.WARN:
        console.warn(logString, data ?? "");
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logString, data ?? "");
        break;
      default:
        console.log(logString, data ?? "");
    }
  }
}
var SolarisedColours = /* @__PURE__ */ ((SolarisedColours2) => {
  SolarisedColours2["BASE03"] = "#002b36";
  SolarisedColours2["BASE02"] = "#073642";
  SolarisedColours2["BASE01"] = "#586e75";
  SolarisedColours2["BASE00"] = "#657b83";
  SolarisedColours2["BASE0"] = "#839496";
  SolarisedColours2["BASE1"] = "#93a1a1";
  SolarisedColours2["BASE2"] = "#eee8d5";
  SolarisedColours2["BASE3"] = "#fdf6e3";
  SolarisedColours2["YELLOW"] = "#b58900";
  SolarisedColours2["ORANGE"] = "#cb4b16";
  SolarisedColours2["RED"] = "#dc322f";
  SolarisedColours2["MAGENTA"] = "#d33682";
  SolarisedColours2["VIOLET"] = "#6c71c4";
  SolarisedColours2["BLUE"] = "#268bd2";
  SolarisedColours2["CYAN"] = "#2aa198";
  SolarisedColours2["GREEN"] = "#859900";
  return SolarisedColours2;
})(SolarisedColours || {});
class SolarisedLogger extends AbstractLogger {
  /**
   * Creates a new SolarisedLogger instance.
   * @param moduleId - The module identifier for this logger
   * @param options - Configuration options for the logger
   */
  constructor(moduleId, options = {}) {
    super(moduleId, options);
    __publicField(this, "moduleIdColour");
    __publicField(this, "useBackgroundColours");
    this.moduleIdColour = options.moduleIdColour ?? SolarisedColours.VIOLET;
    this.useBackgroundColours = options.useBackgroundColours ?? false;
  }
  /**
   * Process a log message by outputting to the console with Solarised colours.
   * @param logMessage - The log message to process
   */
  processLogMessage(logMessage) {
    const { level, message, timestamp, moduleId, data } = logMessage;
    const levelName = this.getLevelName(level);
    const styles = [];
    let formatString = "";
    if (this.includeTimestamps) {
      const formattedTimestamp = this.timestampFormatter(timestamp);
      formatString += "%c[" + formattedTimestamp + "] ";
      styles.push(`color: ${SolarisedColours.BASE01}`);
    }
    formatString += "%c[" + moduleId + "] ";
    styles.push(`color: ${this.moduleIdColour}; font-weight: bold`);
    formatString += "%c[" + levelName + "] ";
    styles.push(this.getLevelStyle(level));
    formatString += "%c" + message;
    styles.push(`color: ${SolarisedColours.BASE0}`);
    console.groupCollapsed(formatString, ...styles);
    if (data !== void 0) {
      console.dir(data);
    }
    if (logMessage.context && Object.keys(logMessage.context).length > 0) {
      console.groupCollapsed("Context");
      console.table(logMessage.context);
      console.groupEnd();
    }
    console.groupEnd();
  }
  /**
   * Get the CSS style for a log level.
   * @param level - The log level
   * @returns CSS style string for the level
   */
  getLevelStyle(level) {
    let colour;
    let backgroundColour = "transparent";
    let fontWeight = "normal";
    switch (level) {
      case LogLevel.DEBUG:
        colour = SolarisedColours.BLUE;
        break;
      case LogLevel.INFO:
        colour = SolarisedColours.CYAN;
        break;
      case LogLevel.WARN:
        colour = SolarisedColours.YELLOW;
        fontWeight = "bold";
        break;
      case LogLevel.ERROR:
        colour = SolarisedColours.ORANGE;
        fontWeight = "bold";
        break;
      case LogLevel.FATAL:
        colour = SolarisedColours.RED;
        fontWeight = "bold";
        break;
      default:
        colour = SolarisedColours.BASE0;
    }
    if (this.useBackgroundColours) {
      backgroundColour = colour;
      colour = SolarisedColours.BASE3;
    }
    return `color: ${colour}; background-color: ${backgroundColour}; font-weight: ${fontWeight}`;
  }
}
class FoundryLogger {
  /**
   * Creates a new FoundryLogger instance.
   * @param moduleId - The Foundry VTT module ID
   * @param options - Configuration options for the logger
   */
  constructor(moduleId, options = {}) {
    __publicField(this, "logger");
    __publicField(this, "useFoundryPrefix");
    const logLevel = options.level ?? LogLevel.INFO;
    const loggerOptions = {
      // Use the provided colour or default to YELLOW for Foundry modules
      moduleIdColour: options.moduleIdColour ?? SolarisedColours.YELLOW,
      useBackgroundColours: options.useBackgroundColours ?? false,
      level: logLevel,
      includeTimestamps: options.includeTimestamps ?? true,
      context: options.context
    };
    this.logger = LoggerFactory.getInstance().getSolarisedLogger(moduleId, loggerOptions);
    this.logger.level = logLevel;
    this.useFoundryPrefix = options.useFoundryPrefix ?? false;
  }
  /**
   * The module identifier for this logger instance.
   */
  get moduleId() {
    return this.logger.moduleId;
  }
  /**
   * The current minimum log level for this logger.
   */
  get level() {
    return this.logger.level;
  }
  set level(value) {
    this.logger.level = value;
  }
  /**
   * Log a debug message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  debug(message, data) {
    this.logger.debug(message, data);
    return this;
  }
  /**
   * Log an info message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  info(message, data) {
    this.logger.info(message, data);
    return this;
  }
  /**
   * Log a warning message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  warn(message, data) {
    this.logger.warn(message, data);
    return this;
  }
  /**
   * Log an error message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  error(message, data) {
    this.logger.error(message, data);
    return this;
  }
  /**
   * Log a fatal message.
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  fatal(message, data) {
    this.logger.fatal(message, data);
    return this;
  }
  /**
   * Log a message with a specific level.
   * @param level - The log level
   * @param message - Message to log
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  log(level, message, data) {
    this.logger.log(level, message, data);
    return this;
  }
  /**
   * Format and log a message with Foundry's module prefix style.
   * Common usage in Foundry modules: myModule.prefix("Some message")
   * 
   * @param message - Message to log with module prefix
   * @param data - Optional additional data
   * @returns The logger instance for method chaining
   */
  prefix(message, data) {
    if (this.useFoundryPrefix) {
      this.logger.info(`${this.moduleId} | ${message}`, data);
    } else {
      this.logger.info(message, data);
    }
    return this;
  }
  /**
   * Get the underlying SolarisedLogger instance.
   * @returns The underlying SolarisedLogger
   */
  get instance() {
    return this.logger;
  }
}
const _LoggerFactory = class _LoggerFactory {
  /**
   * Private constructor to ensure singleton pattern.
   */
  constructor() {
    __publicField(this, "loggers", /* @__PURE__ */ new Map());
    __publicField(this, "defaultLevel", LogLevel.INFO);
    __publicField(this, "defaultColour");
  }
  /**
   * Get the singleton instance of LoggerFactory.
   * @returns The LoggerFactory instance
   */
  static getInstance() {
    if (!_LoggerFactory.instance) {
      _LoggerFactory.instance = new _LoggerFactory();
    }
    return _LoggerFactory.instance;
  }
  /**
   * Create a hash key for logger caching based on options.
   * @param type - Logger type name
   * @param moduleId - The module identifier
   * @param options - Configuration options
   * @returns A unique key for the logger configuration
   */
  createCacheKey(type, moduleId, options) {
    const parts = [type, moduleId];
    if (options) {
      if (options.level !== void 0) {
        parts.push(`level:${options.level}`);
      }
      if (options.moduleIdColour) {
        parts.push(`colour:${options.moduleIdColour}`);
      }
      if (options.useBackgroundColours !== void 0) {
        parts.push(`bgColour:${options.useBackgroundColours}`);
      }
    }
    return parts.join(":");
  }
  /**
   * Get or create a ConsoleLogger instance for the specified module.
   * @param moduleId - The module identifier
   * @param options - Optional configuration options
   * @returns A ConsoleLogger instance
   */
  getConsoleLogger(moduleId, options = {}) {
    const loggerId = this.createCacheKey("console", moduleId, options);
    let logger = this.loggers.get(loggerId);
    if (!logger) {
      const mergedOptions = {
        ...options,
        level: options.level ?? this.defaultLevel,
        moduleIdColour: options.moduleIdColour ?? this.defaultColour
      };
      logger = new ConsoleLogger(moduleId, mergedOptions);
      this.loggers.set(loggerId, logger);
    }
    return logger;
  }
  /**
   * Get or create a SolarisedLogger instance for the specified module.
   * @param moduleId - The module identifier
   * @param options - Optional configuration options
   * @returns A SolarisedLogger instance
   */
  getSolarisedLogger(moduleId, options = {}) {
    const loggerId = this.createCacheKey("solarised", moduleId, options);
    let logger = this.loggers.get(loggerId);
    if (!logger) {
      const mergedOptions = {
        ...options,
        level: options.level ?? this.defaultLevel,
        moduleIdColour: options.moduleIdColour ?? this.defaultColour
      };
      logger = new SolarisedLogger(moduleId, mergedOptions);
      this.loggers.set(loggerId, logger);
    }
    return logger;
  }
  /**
   * Get or create a FoundryLogger instance for the specified module.
   * @param moduleId - The module identifier
   * @param options - Optional configuration options
   * @returns A FoundryLogger instance
   */
  getFoundryLogger(moduleId, options = {}) {
    const loggerId = this.createCacheKey("foundry", moduleId, options);
    let logger = this.loggers.get(loggerId);
    if (!logger) {
      const mergedOptions = {
        ...options,
        level: options.level ?? this.defaultLevel,
        moduleIdColour: options.moduleIdColour ?? this.defaultColour
      };
      logger = new FoundryLogger(moduleId, mergedOptions);
      this.loggers.set(loggerId, logger);
    }
    return logger;
  }
  /**
   * Set the default moduleIdColour for all new loggers.
   * @param colour - The default colour (hex, rgb, or CSS colour name)
   * @returns The LoggerFactory instance for method chaining
   */
  setDefaultColour(colour) {
    this.defaultColour = colour;
    return this;
  }
  /**
   * Set the default log level for new logger instances.
   * @param level - The default log level
   * @returns The LoggerFactory instance for method chaining
   */
  setDefaultLevel(level) {
    this.defaultLevel = level;
    return this;
  }
  /**
   * Set the log level for all existing logger instances.
   * @param level - The log level to set
   * @returns The LoggerFactory instance for method chaining
   */
  setAllLogLevels(level) {
    this.loggers.forEach((logger) => {
      logger.level = level;
    });
    return this;
  }
  /**
   * Get all registered loggers.
   * @returns An array of all registered loggers
   */
  getAllLoggers() {
    return Array.from(this.loggers.values());
  }
  /**
   * Clear all registered loggers from the cache.
   * @returns The LoggerFactory instance for method chaining
   */
  clearLoggers() {
    this.loggers.clear();
    return this;
  }
};
__publicField(_LoggerFactory, "instance");
let LoggerFactory = _LoggerFactory;
function createFoundryLogger(moduleId, options = {}) {
  return new FoundryLogger(moduleId, options);
}
export {
  AbstractLogger,
  ConsoleLogger,
  FoundryLogger,
  LogLevel,
  LoggerFactory,
  SolarisedColours,
  SolarisedLogger,
  createFoundryLogger,
  LoggerFactory as default,
  getLogLevelName
};
//# sourceMappingURL=log4foundry.js.map

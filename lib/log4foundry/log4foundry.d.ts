/**
 * Abstract base class for loggers implementing the Logger interface.
 */
export declare abstract class AbstractLogger implements Logger {
    /**
     * The module identifier for this logger instance.
     */
    readonly moduleId: string;
    /**
     * The current minimum log level for this logger.
     */
    level: LogLevel;
    /**
     * Whether to include timestamps in log output.
     */
    protected readonly includeTimestamps: boolean;
    /**
     * Custom context to be included with all logs.
     */
    protected readonly context?: Record<string, unknown>;
    /**
     * Function to format timestamps.
     */
    protected readonly timestampFormatter: (timestamp: Date) => string;
    /**
     * Creates a new logger instance.
     * @param moduleId - The module identifier for this logger
     * @param options - Configuration options
     */
    constructor(moduleId: string, options?: LoggerOptions);
    /**
     * Log a debug message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    debug(message: string, data?: unknown): Logger;
    /**
     * Log an info message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    info(message: string, data?: unknown): Logger;
    /**
     * Log a warning message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    warn(message: string, data?: unknown): Logger;
    /**
     * Log an error message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    error(message: string, data?: unknown): Logger;
    /**
     * Log a fatal message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    fatal(message: string, data?: unknown): Logger;
    /**
     * Log a message with a specific level.
     * @param level - The log level
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    log(level: LogLevel, message: string, data?: unknown): Logger;
    /**
     * Process a log message. Must be implemented by derived classes.
     * @param logMessage - The log message to process
     */
    protected abstract processLogMessage(logMessage: LogMessage): void;
    /**
     * Convert a log level to its string representation.
     * @param level - The log level
     * @returns String representation of the log level
     */
    protected getLevelName(level: LogLevel): string;
    /**
     * Default formatter for timestamps.
     * @param timestamp - The timestamp to format
     * @returns The formatted timestamp
     */
    protected defaultTimestampFormatter(timestamp: Date): string;
    /**
     * Set additional context that will be included with all logs.
     * @param context - Context object to include with logs
     * @returns The logger instance for method chaining
     */
    withContext(context: Record<string, unknown>): Logger;
}

/**
 * A simple console logger implementation.
 */
export declare class ConsoleLogger extends AbstractLogger {
    /**
     * Creates a new ConsoleLogger instance.
     * @param moduleId - The module identifier for this logger
     * @param options - Configuration options for the logger
     */
    constructor(moduleId: string, options?: ConsoleLoggerOptions);
    /**
     * Process a log message by outputting to the console.
     * @param logMessage - The log message to process
     */
    protected processLogMessage(logMessage: LogMessage): void;
}

/**
 * Options for configuring the ConsoleLogger.
 */
export declare interface ConsoleLoggerOptions extends LoggerOptions {
    /**
     * Whether to use native console methods (console.debug, console.info, etc.)
     * If false, all logs will use console.log
     */
    useNativeConsoleMethods?: boolean;
}

/**
 * A factory function to create loggers specifically configured for Foundry VTT modules.
 *
 * @param moduleId - The Foundry VTT module ID
 * @param options - Configuration options for the logger
 * @returns A configured FoundryLogger instance
 */
export declare function createFoundryLogger(moduleId: string, options?: FoundryLoggerOptions): FoundryLogger;

/**
 * Foundry logger that wraps a SolarisedLogger with Foundry-specific conveniences.
 */
export declare class FoundryLogger implements Logger {
    private readonly logger;
    private readonly useFoundryPrefix;
    /**
     * Creates a new FoundryLogger instance.
     * @param moduleId - The Foundry VTT module ID
     * @param options - Configuration options for the logger
     */
    constructor(moduleId: string, options?: FoundryLoggerOptions);
    /**
     * The module identifier for this logger instance.
     */
    get moduleId(): string;
    /**
     * The current minimum log level for this logger.
     */
    get level(): LogLevel;
    set level(value: LogLevel);
    /**
     * Log a debug message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    debug(message: string, data?: unknown): Logger;
    /**
     * Log an info message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    info(message: string, data?: unknown): Logger;
    /**
     * Log a warning message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    warn(message: string, data?: unknown): Logger;
    /**
     * Log an error message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    error(message: string, data?: unknown): Logger;
    /**
     * Log a fatal message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    fatal(message: string, data?: unknown): Logger;
    /**
     * Log a message with a specific level.
     * @param level - The log level
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    log(level: LogLevel, message: string, data?: unknown): Logger;
    /**
     * Format and log a message with Foundry's module prefix style.
     * Common usage in Foundry modules: myModule.prefix("Some message")
     *
     * @param message - Message to log with module prefix
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    prefix(message: string, data?: unknown): Logger;
    /**
     * Get the underlying SolarisedLogger instance.
     * @returns The underlying SolarisedLogger
     */
    get instance(): SolarisedLogger;
}

/**
 * Options for configuring the Foundry VTT module logger.
 */
export declare interface FoundryLoggerOptions extends SolarisedLoggerOptions {
    /**
     * Whether to prefix logs with the module ID in Foundry style.
     */
    useFoundryPrefix?: boolean;
}

/**
 * Get the name of a log level.
 * @param level - The log level
 * @returns String representation of the log level
 */
export declare function getLogLevelName(level: LogLevel): string;

export declare interface Logger {
    /**
     * The name identifier for this logger instance.
     */
    readonly moduleId: string;
    /**
     * The current minimum log level for this logger.
     */
    level: LogLevel;
    /**
     * Log a debug message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    debug(message: string, data?: unknown): Logger;
    /**
     * Log an info message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    info(message: string, data?: unknown): Logger;
    /**
     * Log a warning message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    warn(message: string, data?: unknown): Logger;
    /**
     * Log an error message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    error(message: string, data?: unknown): Logger;
    /**
     * Log a fatal message.
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    fatal(message: string, data?: unknown): Logger;
    /**
     * Log a message with a specific level.
     * @param level - The log level
     * @param message - Message to log
     * @param data - Optional additional data
     * @returns The logger instance for method chaining
     */
    log(level: LogLevel, message: string, data?: unknown): Logger;
}

/**
 * Factory class for creating and managing logger instances.
 * Implements the Singleton pattern to ensure only one factory exists in the application.
 */
declare class LoggerFactory {
    private static instance;
    private readonly loggers;
    private defaultLevel;
    private defaultColour;
    /**
     * Private constructor to ensure singleton pattern.
     */
    private constructor();
    /**
     * Get the singleton instance of LoggerFactory.
     * @returns The LoggerFactory instance
     */
    static getInstance(): LoggerFactory;
    /**
     * Create a hash key for logger caching based on options.
     * @param type - Logger type name
     * @param moduleId - The module identifier
     * @param options - Configuration options
     * @returns A unique key for the logger configuration
     */
    private createCacheKey;
    /**
     * Get or create a ConsoleLogger instance for the specified module.
     * @param moduleId - The module identifier
     * @param options - Optional configuration options
     * @returns A ConsoleLogger instance
     */
    getConsoleLogger(moduleId: string, options?: ConsoleLoggerOptions): ConsoleLogger;
    /**
     * Get or create a SolarisedLogger instance for the specified module.
     * @param moduleId - The module identifier
     * @param options - Optional configuration options
     * @returns A SolarisedLogger instance
     */
    getSolarisedLogger(moduleId: string, options?: SolarisedLoggerOptions): SolarisedLogger;
    /**
     * Get or create a FoundryLogger instance for the specified module.
     * @param moduleId - The module identifier
     * @param options - Optional configuration options
     * @returns A FoundryLogger instance
     */
    getFoundryLogger(moduleId: string, options?: FoundryLoggerOptions): FoundryLogger;
    /**
     * Set the default moduleIdColour for all new loggers.
     * @param colour - The default colour (hex, rgb, or CSS colour name)
     * @returns The LoggerFactory instance for method chaining
     */
    setDefaultColour(colour: string): LoggerFactory;
    /**
     * Set the default log level for new logger instances.
     * @param level - The default log level
     * @returns The LoggerFactory instance for method chaining
     */
    setDefaultLevel(level: LogLevel): LoggerFactory;
    /**
     * Set the log level for all existing logger instances.
     * @param level - The log level to set
     * @returns The LoggerFactory instance for method chaining
     */
    setAllLogLevels(level: LogLevel): LoggerFactory;
    /**
     * Get all registered loggers.
     * @returns An array of all registered loggers
     */
    getAllLoggers(): Logger[];
    /**
     * Clear all registered loggers from the cache.
     * @returns The LoggerFactory instance for method chaining
     */
    clearLoggers(): LoggerFactory;
}
export { LoggerFactory }
export default LoggerFactory;

export declare interface LoggerOptions {
    /**
     * Minimum log level. Defaults to INFO.
     */
    level?: LogLevel;
    /**
     * Whether to include timestamps in logs. Defaults to true.
     */
    includeTimestamps?: boolean;
    /**
     * Custom formatter for timestamps. If not provided, the default formatter will be used.
     */
    timestampFormatter?: (timestamp: Date) => string;
    /**
     * Custom context to be included with all logs
     */
    context?: Record<string, unknown>;
    /**
     * Colour for the module identifier. Can be hex, rgb, or CSS colour name.
     */
    moduleIdColour?: string;
}

/**
 * Enum defining standard logging levels.
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
    NONE = 5
}

export declare interface LogMessage {
    /**
     * Log level
     */
    level: LogLevel;
    /**
     * Log message text
     */
    message: string;
    /**
     * Timestamp when the log was created
     */
    timestamp: Date;
    /**
     * Module identifier that created the log
     */
    moduleId: string;
    /**
     * Optional additional data to log
     */
    data?: unknown;
    /**
     * Optional context information
     */
    context?: Record<string, unknown>;
}

/**
 * Solarised colour palette.
 */
export declare enum SolarisedColours {
    BASE03 = "#002b36",// Dark background
    BASE02 = "#073642",// Dark background (highlights)
    BASE01 = "#586e75",// Content (secondary)
    BASE00 = "#657b83",// Content
    BASE0 = "#839496",// Content (primary)
    BASE1 = "#93a1a1",// Content (emphasized)
    BASE2 = "#eee8d5",// Light background (highlights)
    BASE3 = "#fdf6e3",// Light background
    YELLOW = "#b58900",// Warnings
    ORANGE = "#cb4b16",// Errors
    RED = "#dc322f",// Fatal/Severe errors
    MAGENTA = "#d33682",// Special
    VIOLET = "#6c71c4",// Info
    BLUE = "#268bd2",// Debug
    CYAN = "#2aa198",// Verbose/Trace
    GREEN = "#859900"
}

/**
 * A logger implementation using the Solarised colour palette.
 */
export declare class SolarisedLogger extends AbstractLogger {
    private readonly moduleIdColour;
    private readonly useBackgroundColours;
    /**
     * Creates a new SolarisedLogger instance.
     * @param moduleId - The module identifier for this logger
     * @param options - Configuration options for the logger
     */
    constructor(moduleId: string, options?: SolarisedLoggerOptions);
    /**
     * Process a log message by outputting to the console with Solarised colours.
     * @param logMessage - The log message to process
     */
    protected processLogMessage(logMessage: LogMessage): void;
    /**
     * Get the CSS style for a log level.
     * @param level - The log level
     * @returns CSS style string for the level
     */
    private getLevelStyle;
}

/**
 * Options for the SolarisedLogger.
 */
export declare interface SolarisedLoggerOptions extends LoggerOptions {
    /**
     * Custom colour for the module identifier. Defaults to Violet.
     */
    moduleIdColour?: string;
    /**
     * Whether to use background colours for log levels. Defaults to false.
     */
    useBackgroundColours?: boolean;
}

export { }

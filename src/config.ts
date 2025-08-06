export const MODULE_ID = 'shadows-and-secrets';
export const MODULE_NAME = 'Shadows & Secrets';
export const MODULE_ABBR = 'SNS';

export const SETTINGS = {
  LOG_LEVEL: 'log-level',
  SHOW_HEALTH_DISPLAY: 'showHealthDisplay'
} as const;

export const LOG_LEVEL_CHOICES = {
  'debug': 'Debug',
  'info': 'Info',
  'warn': 'Warning',
  'error': 'Error',
  'fatal': 'Fatal',
  'none': 'None'
} as const;

export const CONSTANTS = {
  MODULE_ID,
  MODULE_NAME,
  MODULE_ABBR,

  FLAGS: {
    ELEVATION: 'elevation',
    HEIGHT: 'height',
    SHAPE: 'shape',
    BLOCKING: 'blocking',
    WALL_HEIGHT: 'wallHeight'
  },

  DEFAULTS: {
    SCENE_CEILING: 4000,
    TOKEN_HEIGHT: 100,
    Z_STEP: 50,
    MAX_STEP_HEIGHT: 50,
    GRID_SIZE: 100
  },

  COLOURS: {
    // Canvas overlays
    BOUNDARY_HOVER: 0x00ff00,
    BOUNDARY_SELECTED: 0x0088ff,
    COLLISION: 0xff0000,
    FACING: 0xffff00,
    PATH: 0x00ffff,
    ELEVATION: 0xff00ff,
    FACING_ARC: 0x8A6A1C,
    
    // Health visualisation colours (used by health arcs, health display, etc.)
    HEALTH: {
      BACKGROUND: '#222222',
      HIGH: '#3F5C41',
      MEDIUM: '#2F3D2E', 
      LOW: '#5B1A18',
      TEMPORARY: '#B34141'
    }
  },

  ALPHA: {
    BOUNDARY: 0.2,
    COLLISION: 0.4,
    FACING: 0.6,
    PATH: 0.3,
    FACING_ARC_LINE: 0.9,
    FACING_ARC_FILL: 0.0
  },

  LINE_WIDTH: {
    BOUNDARY: 2,
    FACING: 3,
    PATH: 2,
    FACING_ARC: 1
  },

  SIZES: {
    TOKEN: 1,
    SCENE: 1,
    FACING_ARC_RADIUS_MULTIPLIER: 0.5,
    FACING_ARC_ANGLE: 21
  },

  MOVEMENT_TYPES: {
    WALK: 'walk',
    FLY: 'fly',
    SWIM: 'swim',
    BURROW: 'burrow',
    CLIMB: 'climb',
    HOVER: 'hover',
  }
} as const;

export type ModuleConstants = typeof CONSTANTS;
export type LogLevelChoice = keyof typeof LOG_LEVEL_CHOICES;
export type HealthColours = typeof CONSTANTS.COLOURS.HEALTH;
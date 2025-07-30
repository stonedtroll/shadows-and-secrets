/**
 * Defines the valid disposition values for tokens.
 * These values represent the token's attitude towards the player characters.
 */

/**
 * Token disposition constants matching Foundry VTT's CONST.TOKEN_DISPOSITIONS
 */
export const DISPOSITION = {
    /** Hostile towards player characters */
    HOSTILE: -1,
    /** Neutral stance */
    NEUTRAL: 0,
    /** Friendly towards player characters */
    FRIENDLY: 1,
    /** Secret/hidden disposition */
    SECRET: -2
} as const;

/**
 * Union type of valid disposition values
 */
export type DispositionValue = typeof DISPOSITION[keyof typeof DISPOSITION];

/**
 * Type guard to check if a value is a valid disposition
 */
export function isValidDisposition(value: unknown): value is DispositionValue {
    return (
        typeof value === 'number' &&
        Object.values(DISPOSITION).includes(value as DispositionValue)
    );
}

/**
 * Gets the name of a disposition value
 */
export function getDispositionName(value: DispositionValue): keyof typeof DISPOSITION {
    const entry = Object.entries(DISPOSITION).find(([, val]) => val === value);
    return entry?.[0] as keyof typeof DISPOSITION;
}
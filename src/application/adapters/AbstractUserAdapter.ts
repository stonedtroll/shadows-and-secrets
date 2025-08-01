/**
 * Abstract adapter interface for user entities.
 */
export interface AbstractUserAdapter {
    readonly id: string;
    readonly name: string;
    readonly isGM: boolean;
    readonly colour: string;
    readonly isActive: boolean;
    readonly avatar: string | null;
}
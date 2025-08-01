/**
 * Domain entity representing a user in the game.
 */
import type { AbstractUserAdapter } from '../../application/adapters/AbstractUserAdapter.js';

export class User {
    public readonly id: string;
    public readonly isGM: boolean;
    public readonly colour: string;

    /**
     * Creates a new User domain entity.
     */
    constructor(userAdapter: AbstractUserAdapter) {
        this.id = userAdapter.id;
        this.isGM = userAdapter.isGM;
        this.colour = userAdapter.colour;
    }

    /**
     * Checks if this user is the same as another user.
     */
    equals(other: User): boolean {
        return this.id === other.id;
    }
}
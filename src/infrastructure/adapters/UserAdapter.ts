/**
 * Adapter for Foundry VTT User entities.
 */

import type { AbstractUserAdapter } from '../../application/adapters/AbstractUserAdapter.js';
import { User } from '../../domain/entities/User.js';

export class UserAdapter implements AbstractUserAdapter {
    constructor(private readonly foundryUser: User) {
        if (!foundryUser) {
            throw new Error('Foundry user is required');
        }
    }

    get id(): string {
        const id = this.foundryUser.id;
        if (!id) {
            throw new Error('User ID is not available');
        }
        return id;
    }

    get name(): string {
        return this.foundryUser.name || 'Unknown User';
    }

    get isGM(): boolean {
        return this.foundryUser.isGM;
    }

    get colour(): string {
        return this.foundryUser.color;
    }

    get isActive(): boolean {
        return this.foundryUser.active;
    }

    get avatar(): string | null {
        return this.foundryUser.avatar || null;
    }
}
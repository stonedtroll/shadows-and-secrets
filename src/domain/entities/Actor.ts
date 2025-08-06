import type { AbstractActorAdapter } from '../../application/adapters/AbstractActorAdapter.js';

import { MovementTypes, Speed } from '../value-objects/Speed.js';
import { Weapon } from '../value-objects/Weapon.js';
import { Anguish } from '../value-objects/Anguish.js';

export class Actor {
    private readonly _actorAdapter: AbstractActorAdapter;

    constructor(actorAdapter: AbstractActorAdapter) {
        this._actorAdapter = actorAdapter;
    }

    get id(): string | null { return this._actorAdapter.id; }

    get name(): string { return this._actorAdapter.name; }

    get type(): string { return this._actorAdapter.type; }

    get speeds(): ReadonlyArray<Speed> {
        return this._actorAdapter.speeds;
    }

    get equippedWeapons(): ReadonlyArray<Weapon> {
        return this._actorAdapter.fetchEquippedWeapons();
    }
    
    hasMovementMode(mode: MovementTypes): boolean {
        return this._actorAdapter.speeds.some(s => s.mode === mode);
    }

    get health(): number {
        return this._actorAdapter.health;
    }

    get maxHealth(): number {
        return this._actorAdapter.maxHealth;
    }

    get tempHealth(): number {
        return this._actorAdapter.tempHealth;
    }

    get tempMaxHealth(): number {
        return this._actorAdapter.tempMaxHealth;
    }

    get healthPercentage(): number {
        return this.maxHealth > 0 ? (this.health / this.maxHealth) * 100 : 0;
    }
    
    get anguish(): number {
        return this._actorAdapter.anguish;
    }

    set anguish(value: number) {
        this._actorAdapter.anguish = value;
    }

    get maxAnguish(): number {
        return this._actorAdapter.maxAnguish;
    }   

    get anguishPercentage(): number {
        return this.maxAnguish > 0 ? (this.anguish / this.maxAnguish) * 100 : 0;
    }

    getAnguish(): Anguish {
        return Anguish.create({
            current: this.anguish,
            max: this.maxAnguish
        });
    }
}
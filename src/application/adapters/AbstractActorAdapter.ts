import { Speed } from "../../domain/value-objects/Speed";
import { Weapon } from '../../domain//value-objects/Weapon.js';

export abstract class AbstractActorAdapter {
    constructor(protected actor: Actor) { }

    abstract get id(): string | null;
    abstract get name(): string;
    abstract get type(): string;
    abstract get speeds(): ReadonlyArray<Speed>;
    abstract get health(): number;
    abstract get maxHealth(): number;
    abstract get tempHealth(): number;
    abstract get tempMaxHealth(): number;
    abstract get healthPercentage(): number;
    abstract fetchEquippedWeapons(): ReadonlyArray<Weapon>;
}
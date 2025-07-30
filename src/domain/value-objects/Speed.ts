import { CONSTANTS } from '../../config.js';
import { MODULE_ID } from '../../config.js';

export type MovementTypes = typeof CONSTANTS.MOVEMENT_TYPES[keyof typeof CONSTANTS.MOVEMENT_TYPES];

export class Speed {
    private readonly _rate: number;
    private readonly _unit: string;
    private readonly _mode: MovementTypes;
    private readonly _hash: string;

    private constructor(rate: number, unit: string, mode: MovementTypes) {
        this._rate = Math.max(0, rate);
        this._unit = unit;
        this._mode = mode;
        this._hash = `${mode}:${rate}${unit}`;
    }

    static create(rate: number, unit: string = 'm', mode: MovementTypes): Speed {
        return new Speed(rate, unit, mode);
    }

    get rate(): number {
        return this._rate;
    }

    get unit(): string {
        return this._unit;
    }

    get mode(): MovementTypes {
        return this._mode;
    }

    get icon(): string {
        return `modules/${MODULE_ID}/assets/images/icons/movement-type-${this.mode.toLowerCase()}.webp`;
    }

    distanceIn(rounds: number): number {
        return this._rate * rounds;
    }

    timeToTravel(distance: number): number {
        if (this._rate === 0) return Infinity;
        return Math.ceil(distance / this._rate);
    }


    add(other: Speed): Speed {
        if (this._unit !== other._unit || this._mode !== other._mode) {
            throw new Error(`Cannot add speeds of different units or types: ${this.toString()} + ${other.toString()}`);
        }
        return new Speed(this._rate + other._rate, this._unit, this._mode);
    }

    subtract(other: Speed): Speed {
        if (this._unit !== other._unit || this._mode !== other._mode) {
            throw new Error(`Cannot subtract speeds of different units or types: ${this.toString()} - ${other.toString()}`);
        }
        return new Speed(this._rate - other._rate, this._unit, this._mode);
    }

    multiply(scalar: number): Speed {
        return new Speed(this._rate * scalar, this._unit, this._mode);
    }

    divide(scalar: number): Speed {
        if (scalar === 0) {
            throw new Error('Cannot divide speed by zero');
        }
        return new Speed(this._rate / scalar, this._unit, this._mode);
    }

    modify(percentage: number): Speed {
        return new Speed(this._rate * (percentage / 100), this._unit, this._mode);
    }

    round(): Speed {
        return new Speed(Math.round(this._rate), this._unit, this._mode);
    }

    isZero(): boolean {
        return this._rate === 0;
    }

    equals(other: Speed): boolean {
        if (this === other) return true;
        return this._hash === other._hash;
    }

    toString(): string {     
        return `${this._rate} ${this._unit} ${this.mode}`;
    }
}

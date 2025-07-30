import { AbstractGridAdapter } from "../..//application/adapters/AbstractGridAdapter";

export enum GridType {
    GRIDLESS = 'gridless',
    SQUARE = 'square',
    HEX_ODDR = 'hexOddR',
    HEX_EVENR = 'hexEvenR',
    HEX_ODDQ = 'hexOddQ',
    HEX_EVENQ = 'hexEvenQ'
}

export enum DiagonalMovementRule {
    EQUIDISTANT = 'equidistant',
    ALTERNATING_5105 = '5105',
    EUCLIDEAN = 'euclidean'
}

export class Grid {

    private _gridAdapter: AbstractGridAdapter;

    constructor(gridAdapter: AbstractGridAdapter) {
        this._gridAdapter = gridAdapter;
    }

    get type(): GridType {
        return this._gridAdapter.type as GridType;
    }

    get size(): number {
        return this._gridAdapter.size;
    }

    get distance(): number {
        return this._gridAdapter.distance;
    }

    get units(): string {
        return this._gridAdapter.units;
    }

    get diagonalRule(): DiagonalMovementRule {
        return this._gridAdapter.diagonalRule as DiagonalMovementRule;
    }

    get isGridless(): boolean {
        return this._gridAdapter.isGridless;
    }
    get isSquare(): boolean {
        return this._gridAdapter.isSquare;
    }

    get isHex(): boolean {
        return [
            GridType.HEX_ODDR,
            GridType.HEX_EVENR,
            GridType.HEX_ODDQ,
            GridType.HEX_EVENQ
        ].includes(this.type);
    }

    /**
     * Convert pixel distance to grid units
     */
    pixelsToUnits(pixels: number): number {
        return (pixels / this.size) * this.distance;
    }

    /**
     * Convert grid units to pixels
     */
    unitsToPixels(units: number): number {
        return (units / this.distance) * this.size;
    }
}
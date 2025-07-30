export class VerticalExtent {
    constructor(
        public readonly min: number,
        public readonly max: number
    ) {
        if (min > max) {
            throw new Error('Minimum elevation cannot be greater than maximum elevation');
        }
    }

    get height(): number {
        return this.max - this.min;
    }

    get centre(): number {
        return (this.min + this.max) / 2;
    }

    overlaps(other: VerticalExtent): boolean {
        return this.min < other.max && this.max > other.min;
    }

    contains(elevation: number): boolean {
        return elevation >= this.min && elevation <= this.max;
    }

    containsFully(other: VerticalExtent): boolean {
        return this.min <= other.min && this.max >= other.max;
    }

    union(other: VerticalExtent): VerticalExtent {
        return new VerticalExtent(
            Math.min(this.min, other.min),
            Math.max(this.max, other.max)
        );
    }

    intersection(other: VerticalExtent): VerticalExtent | null {
        if (!this.overlaps(other)) {
            return null;
        }
        return new VerticalExtent(
            Math.max(this.min, other.min),
            Math.min(this.max, other.max)
        );
    }

    /**
     * Create a VerticalExtent from a centre point and height
     */
    static fromCentreAndHeight(centre: number, height: number): VerticalExtent {
        const halfHeight = height / 2;
        return new VerticalExtent(centre - halfHeight, centre + halfHeight);
    }

    /**
     * Create a VerticalExtent from an elevation and height
     */
    static fromHeightAtElevation(elevation: number, height: number): VerticalExtent {
        return new VerticalExtent(elevation, elevation + height);
    }

    equals(other: VerticalExtent): boolean {
        return this.min === other.min && this.max === other.max;
    }

    toString(): string {
        return `VerticalExtent(${this.min} to ${this.max})`;
    }

    translate(offset: number): VerticalExtent {
        return new VerticalExtent(this.min + offset, this.max + offset);
    }
}
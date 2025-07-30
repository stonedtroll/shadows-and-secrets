/**
 * Rotation value object for handling angular calculations
 */
export class Rotation {
  private readonly _degrees: number;

  constructor(degrees: number) {
    // Normalise to 0-360 range
    this._degrees = ((degrees % 360) + 360) % 360;
  }

  static fromRadians(radians: number): Rotation {
    return new Rotation(radians * 180 / Math.PI);
  }

  get degrees(): number {
    return this._degrees;
  }

  get radians(): number {
    return this._degrees * Math.PI / 180;
  }

  /**
   * Calculate the shortest angular difference to another rotation
   * @returns Delta in range -180 to 180
   */
  deltaTo(other: Rotation): number {
    let delta = other._degrees - this._degrees;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }

  /**
   * Determine if rotation to target is clockwise
   */
  isClockwiseTo(other: Rotation): boolean {
    return this.deltaTo(other) > 0;
  }

  /**
   * Add degrees to this rotation
   */
  add(degrees: number): Rotation {
    return new Rotation(this._degrees + degrees);
  }

  /**
   * Linear interpolation to another rotation
   */
  lerp(other: Rotation, t: number): Rotation {
    const delta = this.deltaTo(other);
    return new Rotation(this._degrees + delta * t);
  }
}
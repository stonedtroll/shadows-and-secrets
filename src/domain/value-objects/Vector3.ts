import { Vector2 } from './Vector2';
import { Rotation } from './Rotation';

export class Vector3 {
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) { }

    add(other: Vector3): Vector3 {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    subtract(other: Vector3): Vector3 {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiply(scalar: number): Vector3 {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    divide(scalar: number): Vector3 {
        if (scalar === 0) {
            throw new Error('Division by zero');
        }
        return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    distanceTo(other: Vector3): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    distanceSquaredTo(other: Vector3): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return dx * dx + dy * dy + dz * dz;
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    magnitudeSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalised(): Vector3 {
        const mag = this.magnitude();
        if (mag === 0) {
            return new Vector3(0, 0, 0);
        }
        return this.divide(mag);
    }

    dot(other: Vector3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    cross(other: Vector3): Vector3 {
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }



    /**
     * Rotate around the X axis using a Rotation object
     */
    rotateX(rotation: Rotation): Vector3 {
        const radians = rotation.radians;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return new Vector3(
            this.x,
            this.y * cos - this.z * sin,
            this.y * sin + this.z * cos
        );
    }

    /**
     * Rotate around the Y axis using a Rotation object
     */
    rotateY(rotation: Rotation): Vector3 {
        const radians = rotation.radians;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return new Vector3(
            this.x * cos + this.z * sin,
            this.y,
            -this.x * sin + this.z * cos
        );
    }

    /**
     * Rotate around the Z axis using a Rotation object
     */
    rotateZ(rotation: Rotation): Vector3 {
        const radians = rotation.radians;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return new Vector3(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos,
            this.z
        );
    }

    /**
     * Rotate around an arbitrary axis using a Rotation object
     */
    rotateAroundAxis(axis: Vector3, rotation: Rotation): Vector3 {
        const radians = rotation.radians;
        const normalisedAxis = axis.normalised();
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const oneMinusCos = 1 - cos;
        
        const { x: ax, y: ay, z: az } = normalisedAxis;
        
        // Use tuple type for better type safety
        const rotationMatrix: readonly [
            readonly [number, number, number],
            readonly [number, number, number],
            readonly [number, number, number]
        ] = [
            [cos + ax * ax * oneMinusCos, ax * ay * oneMinusCos - az * sin, ax * az * oneMinusCos + ay * sin],
            [ay * ax * oneMinusCos + az * sin, cos + ay * ay * oneMinusCos, ay * az * oneMinusCos - ax * sin],
            [az * ax * oneMinusCos - ay * sin, az * ay * oneMinusCos + ax * sin, cos + az * az * oneMinusCos]
        ] as const;
        
        return new Vector3(
            this.x * rotationMatrix[0][0] + this.y * rotationMatrix[0][1] + this.z * rotationMatrix[0][2],
            this.x * rotationMatrix[1][0] + this.y * rotationMatrix[1][1] + this.z * rotationMatrix[1][2],
            this.x * rotationMatrix[2][0] + this.y * rotationMatrix[2][1] + this.z * rotationMatrix[2][2]
        );
    }

    equals(other: Vector3): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Project this vector onto another vector
     */
    projectOnto(other: Vector3): Vector3 {
        const scalar = this.dot(other) / other.magnitudeSquared();
        return other.multiply(scalar);
    }

    /**
     * Get the angle between this vector and another in radians
     */
    angleTo(other: Vector3): number {
        const denominator = Math.sqrt(this.magnitudeSquared() * other.magnitudeSquared());
        if (denominator === 0) return 0;
        
        const cosine = this.dot(other) / denominator;
        // Clamp to avoid numerical errors with acos
        const clampedCosine = Math.max(-1, Math.min(1, cosine));
        return Math.acos(clampedCosine);
    }

    /**
     * Convert to a Vector2 by dropping the z component
     */
    toVector2(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    static fromSpherical(radius: number, theta: number, phi: number): Vector3 {
        return new Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );
    }

    static zero(): Vector3 {
        return new Vector3(0, 0, 0);
    }

    static one(): Vector3 {
        return new Vector3(1, 1, 1);
    }

    static up(): Vector3 {
        return new Vector3(0, 1, 0);
    }

    static down(): Vector3 {
        return new Vector3(0, -1, 0);
    }

    static left(): Vector3 {
        return new Vector3(-1, 0, 0);
    }

    static right(): Vector3 {
        return new Vector3(1, 0, 0);
    }

    static forward(): Vector3 {
        return new Vector3(0, 0, 1);
    }

    static back(): Vector3 {
        return new Vector3(0, 0, -1);
    }

    lerp(other: Vector3, t: number): Vector3 {
        return new Vector3(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t,
            this.z + (other.z - this.z) * t
        );
    }

    /**
     * Spherical linear interpolation between two vectors
     */
    slerp(other: Vector3, t: number): Vector3 {
        const dot = this.normalised().dot(other.normalised());
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const theta = Math.acos(clampedDot) * t;
        
        const relativeVec = other.subtract(this.multiply(dot));
        const normalisedRelative = relativeVec.normalised();
        
        return this.multiply(Math.cos(theta)).add(normalisedRelative.multiply(Math.sin(theta)));
    }
}
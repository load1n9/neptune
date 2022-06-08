import { IVector } from "../types.ts";

export class Vector {
  static create(x = 0, y = 0): IVector {
    return { x, y };
  }

  static clone(vector: IVector): IVector {
    return { x: vector.x, y: vector.y };
  }

  static magnitude(vector: IVector): number {
    return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
  }

  static magnitudeSquared(vector: IVector): number {
    return (vector.x * vector.x) + (vector.y * vector.y);
  }

  static rotate(
    vector: IVector,
    angle: number,
    output = Vector.create(),
  ): IVector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = vector.x * cos - vector.y * sin;
    output.y = vector.x * sin + vector.y * cos;
    output.x = x;
    return output;
  }

  static rotateAbout(
    vector: IVector,
    angle: number,
    point: IVector,
    output = Vector.create(),
  ): IVector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = point.x +
      ((vector.x - point.x) * cos - (vector.y - point.y) * sin);
    output.y = point.y +
      ((vector.x - point.x) * sin + (vector.y - point.y) * cos);
    output.x = x;
    return output;
  }

  static normalize(vector: IVector): IVector {
    const magnitude = Vector.magnitude(vector);
    return magnitude === 0
      ? { x: 0, y: 0 }
      : { x: vector.x / magnitude, y: vector.y / magnitude };
  }

  static dot(vectorA: IVector, vectorB: IVector): number {
    return (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y);
  }

  static cross(vectorA: IVector, vectorB: IVector): number {
    return (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
  }

  static cross3(vectorA: IVector, vectorB: IVector, vectorC: IVector): number {
    return (vectorB.x - vectorA.x) * (vectorC.y - vectorA.y) -
      (vectorB.y - vectorA.y) * (vectorC.x - vectorA.x);
  }

  static add(
    vectorA: IVector,
    vectorB: IVector,
    output = Vector.create(),
  ): IVector {
    output.x = vectorA.x + vectorB.x;
    output.y = vectorA.y + vectorB.y;
    return output;
  }

  static subtract(
    vectorA: IVector,
    vectorB: IVector,
    output = Vector.create(),
  ): IVector {
    output.x = vectorA.x - vectorB.x;
    output.y = vectorA.y - vectorB.y;
    return output;
  }

  static multiply(vector: IVector, scalar: number): IVector {
    return { x: vector.x * scalar, y: vector.y * scalar };
  }

  static divide(vector: IVector, scalar: number) {
    return { x: vector.x / scalar, y: vector.y / scalar };
  }

  static perpendicular(vector: IVector, negate = false): IVector {
    return {
      x: (negate ? -1 : 1) * -vector.y,
      y: (negate ? -1 : 1) * vector.x,
    };
  }

  static negate(vector: IVector): IVector {
    return { x: -vector.x, y: -vector.y };
  }

  static angle(vectorA: IVector, vectorB: IVector): number {
    return Math.atan2(vectorB.y - vectorA.y, vectorB.x - vectorA.x);
  }
}

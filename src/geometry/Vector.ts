export class Vector {
  constructor(public x = 0, public y = 0) {
  }
  static create(x = 0, y = 0): Vector {
    return new Vector(x, y);
  }
  clone(): Vector {
    return new Vector(this.x, this.y);
  }
  static clone(vector: Vector): Vector {
    return new Vector(vector.x, vector.y);
  }
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  static magnitude(vector: Vector): number {
    return vector.magnitude();
  }
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }
  static magnitudeSquared(vector: Vector): number {
    return vector.magnitudeSquared();
  }
  rotate(angle: number, output = new Vector()): Vector {
    const x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
    output.y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
    output.x = x;
    return output;
  }
  static rotate(vector: Vector, angle: number, output = new Vector()): Vector {
    return vector.rotate(angle, output);
  }
  rotateAbout(angle: number, point: Vector, output = new Vector()): Vector {
    const x = point.x +
      ((this.x - point.x) * Math.cos(angle) -
        (this.y - point.y) * Math.sin(angle));
    output.y = point.y +
      ((this.x - point.x) * Math.sin(angle) +
        (this.y - point.y) * Math.cos(angle));
    output.x = x;
    return output;
  }
  static rotateAbout(
    vector: Vector,
    angle: number,
    point: Vector,
    output = new Vector(),
  ): Vector {
    return vector.rotateAbout(angle, point, output);
  }
  normalize(): Vector {
    const magnitude = this.magnitude();
    return magnitude === 0
      ? new Vector()
      : new Vector(this.x / magnitude, this.y / magnitude);
  }
  static normalize(vector: Vector): Vector {
    return vector.normalize();
  }
  dot(vector: Vector): number {
    return this.x * vector.x + this.y * vector.y;
  }
  static dot(vector1: Vector, vector2: Vector): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
  }
  cross(vector: Vector): number {
    return this.x * vector.y - this.y * vector.x;
  }
  static cross(vector1: Vector, vector2: Vector): number {
    return vector1.x * vector2.y - vector1.y * vector2.x;
  }
  cross3(vector1: Vector, vector2: Vector): number {
    return (vector1.x - this.x) * (vector2.y - this.y) -
      (vector1.y - this.y) * (vector2.x - this.x);
  }
  static cross3(vector1: Vector, vector2: Vector, vector3: Vector): number {
    return (vector2.x - vector1.x) * (vector3.y - vector1.y) -
      (vector2.y - vector1.y) * (vector3.x - vector1.x);
  }
  add(vector: Vector, output = new Vector()): Vector {
    output.x = this.x + vector.x;
    output.y = this.y + vector.y;
    return output;
  }
  static add(vector1: Vector, vector2: Vector, output = new Vector()): Vector {
    output.x = vector1.x + vector2.x;
    output.y = vector1.y + vector2.y;
    return output;
  }
  subtract(vector: Vector, output = new Vector()): Vector {
    output.x = this.x - vector.x;
    output.y = this.y - vector.y;
    return output;
  }
  static subtract(
    vector1: Vector,
    vector2: Vector,
    output = new Vector(),
  ): Vector {
    output.x = vector1.x - vector2.x;
    output.y = vector1.y - vector2.y;
    return output;
  }
  multiply(scalar: number, output = new Vector()): Vector {
    output.x = this.x * scalar;
    output.y = this.y * scalar;
    return output;
  }
  static multiply(
    vector: Vector,
    scalar: number,
    output = new Vector(),
  ): Vector {
    output.x = vector.x * scalar;
    output.y = vector.y * scalar;
    return output;
  }
  divide(scalar: number, output = new Vector()): Vector {
    output.x = this.x / scalar;
    output.y = this.y / scalar;
    return output;
  }
  static divide(vector: Vector, scalar: number, output = new Vector()): Vector {
    output.x = vector.x / scalar;
    output.y = vector.y / scalar;
    return output;
  }
  perpendicular(negate = false, output = new Vector()): Vector {
    output.x = -this.y * (negate ? -1 : 1);
    output.y = this.x * (negate ? -1 : 1);
    return output;
  }
  static perpendicular(
    vector: Vector,
    negate = false,
    output = new Vector(),
  ): Vector {
    output.x = -vector.y * (negate ? -1 : 1);
    output.y = vector.x * (negate ? -1 : 1);
    return output;
  }
  negate(output = new Vector()): Vector {
    output.x = -this.x;
    output.y = -this.y;
    return output;
  }
  static negate(vector: Vector, output = new Vector()): Vector {
    output.x = -vector.x;
    output.y = -vector.y;
    return output;
  }
  angle(vector: Vector): number {
    return Math.atan2(vector.y - this.y, vector.x - this.x);
  }
  static angle(vector1: Vector, vector2: Vector): number {
    return Math.atan2(vector2.y - vector1.y, vector2.x - vector1.x);
  }
}

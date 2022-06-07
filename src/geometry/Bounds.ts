import { Vector } from "./Vector.ts";
import { Vertices } from "./Vertices.ts";

export class Bounds {
  bounds = {
    min: { x: 0, y: 0 },
    max: { x: 0, y: 0 },
  };
  constructor(vertices?: Vertices) {
    if (vertices) {
      this.update(vertices);
    }
  }
  update(vertices: Vertices, velocity?: Vector): void {
    this.bounds.min.x = Infinity;
    this.bounds.max.x = -Infinity;
    this.bounds.min.y = Infinity;
    this.bounds.max.y = -Infinity;
    for (let i = 0; i < vertices.vertices.length; i++) {
      const vertex = vertices.vertices[i];
      if (vertex.x > this.bounds.max.x) this.bounds.max.x = vertex.x;
      if (vertex.x < this.bounds.min.x) this.bounds.min.x = vertex.x;
      if (vertex.y > this.bounds.max.y) this.bounds.max.y = vertex.y;
      if (vertex.y < this.bounds.min.y) this.bounds.min.y = vertex.y;
    }

    if (velocity) {
      if (velocity.x > 0) {
        this.bounds.max.x += velocity.x;
      } else {
        this.bounds.min.x += velocity.x;
      }
      if (velocity.y > 0) {
        this.bounds.max.y += velocity.y;
      } else {
        this.bounds.min.y += velocity.y;
      }
    }
  }
  contains(point: Vector): boolean {
    return point.x >= this.bounds.min.x && point.x <= this.bounds.max.x &&
      point.y >= this.bounds.min.y && point.y <= this.bounds.max.y;
  }
  overlaps(bounds: Bounds): boolean {
    return (this.bounds.min.x <= bounds.bounds.max.x &&
      this.bounds.max.x >= bounds.bounds.min.x &&
      this.bounds.max.y >= bounds.bounds.min.y &&
      this.bounds.min.y <= bounds.bounds.max.y);
  }
  static overlaps(a: Bounds, b: Bounds): boolean {
    return (a.bounds.min.x <= b.bounds.max.x &&
      a.bounds.max.x >= b.bounds.min.x &&
      a.bounds.max.y >= b.bounds.min.y &&
      a.bounds.min.y <= b.bounds.max.y);
  }
  translate(vector: Vector): void {
    this.bounds.min.x += vector.x;
    this.bounds.max.x += vector.x;
    this.bounds.min.y += vector.y;
    this.bounds.max.y += vector.y;
  }
  shift(position: Vector): void {
    const deltaX = this.bounds.max.x - this.bounds.min.x;
    const deltaY = this.bounds.max.y - this.bounds.min.y;
    this.bounds.min.x = position.x;
    this.bounds.max.x = position.x + deltaX;
    this.bounds.min.y = position.y;
    this.bounds.max.y = position.y + deltaY;
  }
}

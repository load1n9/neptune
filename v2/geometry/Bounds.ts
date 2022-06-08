import type { IBounds, IVector, IVertex } from "../types.ts";
import { Vector } from "./Vector.ts";

export class Bounds {
  static create(vertices?: IVertex[]): IBounds {
    const bounds = {
      min: Vector.create(),
      max: Vector.create(),
    };
    if (vertices) Bounds.update(bounds, vertices);
    return bounds;
  }
  static update(
    bounds: IBounds,
    vertices: IVertex[],
    velocity?: IVector,
  ): void {
    bounds.min.x = Infinity;
    bounds.max.x = -Infinity;
    bounds.min.y = Infinity;
    bounds.max.y = -Infinity;

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      if (vertex.x > bounds.max.x) bounds.max.x = vertex.x;
      if (vertex.x < bounds.min.x) bounds.min.x = vertex.x;
      if (vertex.y > bounds.max.y) bounds.max.y = vertex.y;
      if (vertex.y < bounds.min.y) bounds.min.y = vertex.y;
    }

    if (velocity) {
      if (velocity.x > 0) {
        bounds.max.x += velocity.x;
      } else {
        bounds.min.x += velocity.x;
      }
      if (velocity.y > 0) {
        bounds.max.y += velocity.y;
      } else {
        bounds.min.y += velocity.y;
      }
    }
  }
  static contains(bounds: IBounds, point: IVector): boolean {
    return point.x >= bounds.min.x && point.x <= bounds.max.x &&
      point.y >= bounds.min.y && point.y <= bounds.max.y;
  }
  static overlaps(boundsA: IBounds, boundsB: IBounds): boolean {
    return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x &&
      boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
  }
  static translate(bounds: IBounds, vector: IVector): void {
    bounds.min.x += vector.x;
    bounds.max.x += vector.x;
    bounds.min.y += vector.y;
    bounds.max.y += vector.y;
  }
  static shift(bounds: IBounds, position: IVector): void {
    bounds.min.x = position.x;
    bounds.max.x = position.x + (bounds.max.x - bounds.min.x);
    bounds.min.y = position.y;
    bounds.max.y = position.y + (bounds.max.y - bounds.min.y);
  }
}

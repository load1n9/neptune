import { IBody, IBounds, ICollision, IVector } from "../types.ts";
import { Collision } from "./Collision.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { Vertices } from "../geometry/Vertices.ts";

export class Query {
  static collides(body: IBody, bodies: IBody[]): ICollision[] {
    const collisions: ICollision[] = [];
    const bodiesLength = bodies.length;
    const bounds = body.bounds;
    const collides = Collision.collides;
    const overlaps = Bounds.overlaps;

    for (let i = 0; i < bodiesLength; i++) {
      const bodyA = bodies[i];
      const partsALength = bodyA.parts.length;
      const partsAStart = partsALength === 1 ? 0 : 1;

      if (overlaps(bodyA.bounds, bounds)) {
        for (let j = partsAStart; j < partsALength; j++) {
          const part = bodyA.parts[j];

          if (overlaps(part.bounds, bounds)) {
            const collision = collides(part, body);

            if (collision) {
              collisions.push(collision);
              break;
            }
          }
        }
      }
    }
    return collisions;
  }

  static ray(
    bodies: IBody[],
    startPoint: IVector,
    endPoint: IVector,
    rayWidth = 1e-100,
  ): ICollision[] {
    const rayAngle = Vector.angle(startPoint, endPoint);
    const rayLength = Vector.magnitude(Vector.subtract(startPoint, endPoint));
    const rayX = (endPoint.x + startPoint.x) * 0.5;
    const rayY = (endPoint.y + startPoint.y) * 0.5;
    const ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, {
      angle: rayAngle,
    });
    const collisions = Query.collides(ray, bodies);
    collisions.forEach((collision) => {
      collision.bodyB = collision.bodyA;
    });
    return collisions;
  }

  static region(bodies: IBody[], bounds: IBounds, outside = false): IBody[] {
    const result = [];
    for (const body of bodies) {
      if (
        (Bounds.overlaps(body.bounds, bounds) && !outside) ||
        (!Bounds.overlaps(body.bounds, bounds) && outside)
      ) {
        result.push(body);
      }
    }
    return result;
  }

  static point(bodies: IBody[], point: IVector): IBody[] {
    const result: IBody[] = [];
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (Bounds.contains(body.bounds, point)) {
        for (
          let j = body.parts.length === 1 ? 0 : 1;
          j < body.parts.length;
          j++
        ) {
          const part = body.parts[j];

          if (
            Bounds.contains(part.bounds, point) &&
            Vertices.contains(part.vertices, point)
          ) {
            result.push(body);
            break;
          }
        }
      }
    }
    return result;
  }
}

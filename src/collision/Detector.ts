import type { IBody, ICollision, IDetector } from "../types.ts";
import { Common } from "../core/Common.ts";
import { Collision } from "./Collision.ts";

export class Detector {
  static create(options: Partial<IDetector> = {}): IDetector {
    return Common.extend({
      bodies: [],
      pairs: null,
    }, options);
  }

  static setBodies(detector: IDetector, bodies: IBody[]): void {
    detector.bodies = bodies.slice(0);
  }

  static clear(detector: IDetector): void {
    detector.bodies = [];
  }

  static collisions(detector: IDetector): ICollision[] {
    const collisions: ICollision[] = [];
    const { pairs, bodies } = detector;
    const bodiesLength = bodies.length;
    const canCollide = Detector.canCollide;
    const collides = Collision.collides;
    let i: number;
    let j: number;

    for (i = 0; i < bodiesLength; i++) {
      const bodyA = bodies[i];
      const boundsA = bodyA.bounds;
      const boundXMax = boundsA.max.x;
      const boundYMax = boundsA.max.y;
      const boundYMin = boundsA.min.y;
      const bodyAStatic = bodyA.isStatic || bodyA.isSleeping;
      const partsALength = bodyA.parts.length;
      const partsASingle = partsALength === 1;
      for (j = i + 1; j < bodiesLength; j++) {
        const bodyB = bodies[j];
        const boundsB = bodyB.bounds;

        if (boundsB.min.x > boundXMax) {
          break;
        }
        if (boundYMax < boundsB.min.y || boundYMin > boundsB.max.y) {
          continue;
        }

        if (bodyAStatic && (bodyB.isStatic || bodyB.isSleeping)) {
          continue;
        }

        if (!canCollide(bodyA.collisionFilter, bodyB.collisionFilter)) {
          continue;
        }
        const partsBLength = bodyB.parts.length;

        if (partsASingle && partsBLength === 1) {
          const collision = collides(bodyA, bodyB, pairs!);

          if (collision) {
            collisions.push(collision);
          }
        } else {
          const partsAStart = partsALength > 1 ? 1 : 0;
          const partsBStart = partsBLength > 1 ? 1 : 0;

          for (let k = partsAStart; k < partsALength; k++) {
            const partA = bodyA.parts[k];
            const boundsA = partA.bounds;

            for (let z = partsBStart; z < partsBLength; z++) {
              const partB = bodyB.parts[z];
              const boundsB = partB.bounds;

              if (
                boundsA.min.x > boundsB.max.x ||
                boundsA.max.x < boundsB.min.x ||
                boundsA.max.y < boundsB.min.y || boundsA.min.y > boundsB.max.y
              ) {
                continue;
              }

              const collision = collides(partA, partB, pairs!);

              if (collision) {
                collisions.push(collision);
              }
            }
          }
        }
      }
    }
    return collisions;
  }
  // deno-lint-ignore no-explicit-any
  static canCollide(filterA: any, filterB: any): boolean {
    if (filterA.group === filterB.group && filterA.group !== 0) {
      return filterA.group > 0;
    }

    return (filterA.mask & filterB.category) !== 0 &&
      (filterB.mask & filterA.category) !== 0;
  }
}

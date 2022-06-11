import type {
  IAxes,
  IBody,
  ICollision,
  IOverlap,
  IPairs,
  IProjection,
  IVector,
  IVertex,
} from "../types.ts";
import { Vector } from "../geometry/Vector.ts";
import { Vertices } from "../geometry/Vertices.ts";
import { Pair } from "./Pair.ts";

export class Collision {
  static #supports: IVector[] = [];
  static #overlapAB: IOverlap = {
    overlap: 0,
    axis: { x: 100, y: 100 },
  };
  static #overlapBA: IOverlap = {
    overlap: 100,
    axis: { x: 1, y: 1 },
  };

  static create(bodyA: IBody, bodyB: IBody): ICollision {
    return {
      pair: null,
      collided: false,
      bodyA: bodyA,
      bodyB: bodyB,
      parentA: bodyA.parent,
      parentB: bodyB.parent,
      depth: 0,
      normal: Vector.create(),
      tangent: Vector.create(),
      penetration: Vector.create(),
      supports: [],
    };
  }

  static collides(
    bodyA: IBody,
    bodyB: IBody,
    pairs?: IPairs,
  ): ICollision | null {
    Collision.#overlapAxes(
      Collision.#overlapAB,
      bodyA.vertices,
      bodyB.vertices,
      bodyA.axes,
    );
    if (Collision.#overlapAB.overlap <= 0) {
      return null;
    }
    const pair = pairs && pairs.table[Pair.id(bodyA, bodyB)];
    let collision;
    if (!pair) {
      collision = Collision.create(bodyA, bodyB);
      collision.collided = true;
      collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
      collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
      collision.parentA = collision.bodyA.parent;
      collision.parentB = collision.bodyB.parent;
    } else {
      collision = pair.collision;
    }

    bodyA = collision.bodyA;
    bodyB = collision.bodyB;

    const minOverlap =
      Collision.#overlapAB.overlap < Collision.#overlapBA.overlap
        ? Collision.#overlapAB
        : Collision.#overlapBA;

    const normal = collision.normal;
    const supports = collision.supports;
    const minAxis = minOverlap.axis;
    const minAxisX = minAxis.x;
    const minAxisY = minAxis.y;

    if (
      minAxisX * (bodyB.position.x - bodyA.position.x) +
          minAxisY * (bodyB.position.y - bodyA.position.y) < 0
    ) {
      normal.x = minAxisX;
      normal.y = minAxisY;
    } else {
      normal.x = -minAxisX;
      normal.y = -minAxisY;
    }

    collision.tangent.x = -normal.y;
    collision.tangent.y = normal.x;

    collision.depth = minOverlap.overlap;

    collision.penetration.x = normal.x * collision.depth;
    collision.penetration.y = normal.y * collision.depth;

    const supportsB = Collision.#findSupports(bodyA, bodyB, normal, 1);
    let supportCount = 0;

    if (Vertices.contains(bodyA.vertices, supportsB[0])) {
      supports[supportCount++] = supportsB[0];
    }

    if (Vertices.contains(bodyA.vertices, supportsB[1])) {
      supports[supportCount++] = supportsB[1];
    }

    if (supportCount < 2) {
      const supportsA = Collision.#findSupports(bodyB, bodyA, normal, -1);

      if (Vertices.contains(bodyB.vertices, supportsA[0])) {
        supports[supportCount++] = supportsA[0];
      }

      if (supportCount < 2 && Vertices.contains(bodyB.vertices, supportsA[1])) {
        supports[supportCount++] = supportsA[1];
      }
    }

    if (supportCount === 0) {
      supports[supportCount++] = supportsB[0];
    }

    supports.length = supportCount;

    return collision;
  }
  static #overlapAxes(
    result: IOverlap,
    verticesA: IVertex[],
    verticesB: IVertex[],
    axes: IAxes,
  ) {
    const verticesALength = verticesA.length;
    const verticesBLength = verticesB.length;
    const verticesAX = verticesA[0].x;
    const verticesAY = verticesA[0].y;
    const verticesBX = verticesB[0].x;
    const verticesBY = verticesB[0].y;
    const axesLength = axes.length;
    let overlapMin = Number.MAX_VALUE;
    let overlapAxisNumber = 0;
    let overlap;
    let overlapAB;
    let overlapBA;
    let dot;
    let i;
    let j;

    for (i = 0; i < axesLength; i++) {
      const axis = axes[i];
      const axisX = axis.x;
      const axisY = axis.y;
      let minA = verticesAX * axisX + verticesAY * axisY;
      let minB = verticesBX * axisX + verticesBY * axisY;
      let maxA = minA;
      let maxB = minB;

      for (j = 1; j < verticesALength; j += 1) {
        dot = verticesA[j].x * axisX + verticesA[j].y * axisY;

        if (dot > maxA) {
          maxA = dot;
        } else if (dot < minA) {
          minA = dot;
        }
      }

      for (j = 1; j < verticesBLength; j += 1) {
        dot = verticesB[j].x * axisX + verticesB[j].y * axisY;

        if (dot > maxB) {
          maxB = dot;
        } else if (dot < minB) {
          minB = dot;
        }
      }

      overlapAB = maxA - minB;
      overlapBA = maxB - minA;
      overlap = overlapAB < overlapBA ? overlapAB : overlapBA;

      if (overlap < overlapMin) {
        overlapMin = overlap;
        overlapAxisNumber = i;

        if (overlap <= 0) {
          break;
        }
      }
    }
    result.axis = axes[overlapAxisNumber];
    result.overlap = overlapMin;
  }
  static #projectToAxis(
    projection: IProjection,
    vertices: IVertex[],
    axis: IVector,
  ) {
    let min = vertices[0].x * axis.x + vertices[0].y * axis.y;
    let max = min;
    for (const vertex of vertices) {
      const dot = vertex.x * axis.x + vertex.y * axis.y;
      if (dot > max) {
        max = dot;
      } else if (dot < min) {
        min = dot;
      }
    }
    projection.min = min;
    projection.max = max;
  }
  static #findSupports(
    bodyA: IBody,
    bodyB: IBody,
    normal: IVector,
    direction: number,
  ) {
    const vertices = bodyB.vertices;
    const verticesLength = vertices.length;
    const bodyAPositionX = bodyA.position.x;
    const bodyAPositionY = bodyA.position.y;
    const normalX = normal.x * direction;
    const normalY = normal.y * direction;
    let nearestDistance = Number.MAX_VALUE;
    let vertexA: IVertex = vertices[0];
    let vertexB: IVertex = vertices[0];
    let distance;
    let j;

    // find deepest vertex relative to the axis
    for (j = 0; j < verticesLength; j += 1) {
      vertexB = vertices[j];
      distance = normalX * (bodyAPositionX - vertexB.x) +
        normalY * (bodyAPositionY - vertexB.y);

      // convex hill-climbing
      if (distance < nearestDistance) {
        nearestDistance = distance;
        vertexA = vertexB;
      }
    }

    // measure next vertex
    const vertexC =
      vertices[(verticesLength + (vertexA).index - 1) % verticesLength];
    nearestDistance = normalX * (bodyAPositionX - vertexC.x) +
      normalY * (bodyAPositionY - vertexC.y);

    // compare with previous vertex
    vertexB = vertices[(vertexA.index + 1) % verticesLength];
    if (
      normalX * (bodyAPositionX - vertexB.x) +
          normalY * (bodyAPositionY - vertexB.y) < nearestDistance
    ) {
      Collision.#supports[0] = vertexA;
      Collision.#supports[1] = vertexB;

      return Collision.#supports;
    }

    Collision.#supports[0] = vertexA;
    Collision.#supports[1] = vertexC;

    return Collision.#supports;
  }
}

// deno-lint-ignore-file no-explicit-any
import { Common } from "../core/Common.ts";
import { Sleeping } from "../core/Sleeping.ts";
import { Axes } from "../geometry/Axes.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { Vertices } from "../geometry/Vertices.ts";
import { IBody } from "../types.ts";

export class Constraint {
  static _warming = 0.4;
  static _torqueDampen = 1;
  static _minLength = 0.000001;
  static create(options: any) {
    const constraint = options;

    // if bodies defined but no points, use body centre
    if (constraint.bodyA && !constraint.pointA) {
      constraint.pointA = { x: 0, y: 0 };
    }
    if (constraint.bodyB && !constraint.pointB) {
      constraint.pointB = { x: 0, y: 0 };
    }

    // calculate static length using initial world space points
    const initialPointA = constraint.bodyA
      ? Vector.add(constraint.bodyA.position, constraint.pointA)
      : constraint.pointA;
    const initialPointB = constraint.bodyB
      ? Vector.add(constraint.bodyB.position, constraint.pointB)
      : constraint.pointB;
    const length = Vector.magnitude(
      Vector.subtract(initialPointA, initialPointB),
    );

    constraint.length = typeof constraint.length !== "undefined"
      ? constraint.length
      : length;

    // option defaults
    constraint.id = constraint.id || Common.nextId();
    constraint.label = constraint.label || "Constraint";
    constraint.type = "constraint";
    constraint.stiffness = constraint.stiffness ||
      (constraint.length > 0 ? 1 : 0.7);
    constraint.damping = constraint.damping || 0;
    constraint.angularStiffness = constraint.angularStiffness || 0;
    constraint.angleA = constraint.bodyA
      ? constraint.bodyA.angle
      : constraint.angleA;
    constraint.angleB = constraint.bodyB
      ? constraint.bodyB.angle
      : constraint.angleB;
    constraint.plugin = {};

    // render
    const render = {
      visible: true,
      lineWidth: 2,
      strokeStyle: "#ffffff",
      type: "line",
      anchors: true,
    };

    if (constraint.length === 0 && constraint.stiffness > 0.1) {
      render.type = "pin";
      render.anchors = false;
    } else if (constraint.stiffness < 0.9) {
      render.type = "spring";
    }

    constraint.render = Common.extend(render, constraint.render);

    return constraint;
  }

  static preSolveAll(bodies: IBody[]) {
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      const impulse = body.constraintImpulse;

      if (
        body.isStatic ||
        (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0)
      ) {
        continue;
      }

      body.position.x += impulse.x;
      body.position.y += impulse.y;
      body.angle += impulse.angle!;
    }
  }

  static solveAll(constraints: any, timeScale: number) {
    // Solve fixed constraints first.
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      const fixedA = !constraint.bodyA ||
        (constraint.bodyA && constraint.bodyA.isStatic);
      const fixedB = !constraint.bodyB ||
        (constraint.bodyB && constraint.bodyB.isStatic);

      if (fixedA || fixedB) {
        Constraint.solve(constraints[i], timeScale);
      }
    }

    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      const fixedA = !constraint.bodyA ||
        (constraint.bodyA && constraint.bodyA.isStatic);
      const fixedB = !constraint.bodyB ||
        (constraint.bodyB && constraint.bodyB.isStatic);

      if (!fixedA && !fixedB) {
        Constraint.solve(constraints[i], timeScale);
      }
    }
  }

  static solve(constraint: any, timeScale: number) {
    const bodyA = constraint.bodyA;
    const bodyB = constraint.bodyB;
    const pointA = constraint.pointA;
    const pointB = constraint.pointB;

    if (!bodyA && !bodyB) {
      return;
    }

    if (bodyA && !bodyA.isStatic) {
      Vector.rotate(pointA, bodyA.angle - constraint.angleA, pointA);
      constraint.angleA = bodyA.angle;
    }

    if (bodyB && !bodyB.isStatic) {
      Vector.rotate(pointB, bodyB.angle - constraint.angleB, pointB);
      constraint.angleB = bodyB.angle;
    }

    let pointAWorld = pointA,
      pointBWorld = pointB;

    if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
    if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);

    if (!pointAWorld || !pointBWorld) {
      return;
    }

    const delta = Vector.subtract(pointAWorld, pointBWorld);
    let currentLength = Vector.magnitude(delta);

    if (currentLength < Constraint._minLength) {
      currentLength = Constraint._minLength;
    }

    const difference = (currentLength - constraint.length) / currentLength;
    const stiffness = constraint.stiffness < 1
      ? constraint.stiffness * timeScale
      : constraint.stiffness;
    const force = Vector.multiply(delta, difference * stiffness);
    const massTotal = (bodyA ? bodyA.inverseMass : 0) +
      (bodyB ? bodyB.inverseMass : 0);
    const inertiaTotal = (bodyA ? bodyA.inverseInertia : 0) +
      (bodyB ? bodyB.inverseInertia : 0);
    const resistanceTotal = massTotal + inertiaTotal;
    let torque;
    let share;
    let normal: any;
    let normalVelocity: any;
    let relativeVelocity;

    if (constraint.damping) {
      const zero = Vector.create();
      normal = Vector.divide(delta, currentLength);

      relativeVelocity = Vector.subtract(
        bodyB && Vector.subtract(bodyB.position, bodyB.positionPrev) || zero,
        bodyA && Vector.subtract(bodyA.position, bodyA.positionPrev) || zero,
      );

      normalVelocity = Vector.dot(normal, relativeVelocity);
    }

    if (bodyA && !bodyA.isStatic) {
      share = bodyA.inverseMass / massTotal;

      bodyA.constraintImpulse.x -= force.x * share;
      bodyA.constraintImpulse.y -= force.y * share;

      bodyA.position.x -= force.x * share;
      bodyA.position.y -= force.y * share;

      if (constraint.damping) {
        bodyA.positionPrev.x -= constraint.damping * normal.x * normalVelocity *
          share;
        bodyA.positionPrev.y -= constraint.damping * normal.y * normalVelocity *
          share;
      }

      torque = (Vector.cross(pointA, force) / resistanceTotal) *
        Constraint._torqueDampen * bodyA.inverseInertia *
        (1 - constraint.angularStiffness);
      bodyA.constraintImpulse.angle -= torque;
      bodyA.angle -= torque;
    }

    if (bodyB && !bodyB.isStatic) {
      share = bodyB.inverseMass / massTotal;

      bodyB.constraintImpulse.x += force.x * share;
      bodyB.constraintImpulse.y += force.y * share;

      bodyB.position.x += force.x * share;
      bodyB.position.y += force.y * share;

      if (constraint.damping) {
        bodyB.positionPrev.x += constraint.damping * normal.x * normalVelocity *
          share;
        bodyB.positionPrev.y += constraint.damping * normal.y * normalVelocity *
          share;
      }

      torque = (Vector.cross(pointB, force) / resistanceTotal) *
        Constraint._torqueDampen * bodyB.inverseInertia *
        (1 - constraint.angularStiffness);
      bodyB.constraintImpulse.angle += torque;
      bodyB.angle += torque;
    }
  }

  static postSolveAll(bodies: IBody[]) {
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const impulse = body.constraintImpulse;

      if (
        body.isStatic ||
        (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0)
      ) {
        continue;
      }

      Sleeping.set(body, false);

      for (let j = 0; j < body.parts.length; j++) {
        const part = body.parts[j];

        Vertices.translate(part.vertices, impulse);

        if (j > 0) {
          part.position.x += impulse.x;
          part.position.y += impulse.y;
        }

        if (impulse.angle !== 0) {
          Vertices.rotate(part.vertices, impulse.angle!, body.position);
          Axes.rotate(part.axes, impulse.angle!);
          if (j > 0) {
            Vector.rotateAbout(
              part.position,
              impulse.angle!,
              body.position,
              part.position,
            );
          }
        }

        Bounds.update(part.bounds, part.vertices, body.velocity);
      }

      impulse.angle! *= Constraint._warming;
      impulse.x *= Constraint._warming;
      impulse.y *= Constraint._warming;
    }
  }

  static pointAWorld(constraint: any) {
    return {
      x: (constraint.bodyA ? constraint.bodyA.position.x : 0) +
        (constraint.pointA ? constraint.pointA.x : 0),
      y: (constraint.bodyA ? constraint.bodyA.position.y : 0) +
        (constraint.pointA ? constraint.pointA.y : 0),
    };
  }

  static pointBWorld(constraint: any) {
    return {
      x: (constraint.bodyB ? constraint.bodyB.position.x : 0) +
        (constraint.pointB ? constraint.pointB.x : 0),
      y: (constraint.bodyB ? constraint.bodyB.position.y : 0) +
        (constraint.pointB ? constraint.pointB.y : 0),
    };
  }
}

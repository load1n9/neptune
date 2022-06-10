import { Vertices } from "../geometry/Vertices.ts";
import { Bounds } from "../geometry/Bounds.ts";
import type { IBody, IPair } from "../types.ts";

export class Resolver {
  static #restingThresh = 4;
  static #restingThreshTangent = 6;
  static #positionDampen = 0.9;
  static #positionWarming = 0.8;
  static #frictionNormalMultiplier = 5;

  static preSolvePosition(pairs: IPair[]): void {
    for (const pair of pairs) {
      if (!pair.isActive) {
        continue;
      }
      pair.collision.parentA.totalContacts += pair.activeContacts.length;
      pair.collision.parentB.totalContacts += pair.activeContacts.length;
    }
  }

  static solvePosition(pairs: IPair[], timeScale: number): void {
    const positionDampen = Resolver.#positionDampen;
    for (const pair of pairs) {
      if (!pair.isActive || pair.isSensor) {
        continue;
      }

      const collision = pair.collision;
      const bodyA = collision.parentA;
      const bodyB = collision.parentB;
      const normal = collision.normal;
      pair.separation = normal.x *
          (bodyB.positionImpulse.x + collision.penetration.x -
            bodyA.positionImpulse.x) +
        normal.y *
          (bodyB.positionImpulse.y + collision.penetration.y -
            bodyA.positionImpulse.y);
    }

    for (const pair of pairs) {
      if (!pair.isActive || pair.isSensor) {
        continue;
      }

      const collision = pair.collision;
      const bodyA = collision.parentA;
      const bodyB = collision.parentB;
      const normal = collision.normal;
      let positionImpulse = (pair.separation - pair.slop) * timeScale;

      if (bodyA.isStatic || bodyB.isStatic) {
        positionImpulse *= 2;
      }

      if (!(bodyA.isStatic || bodyA.isSleeping)) {
        bodyA.positionImpulse.x += normal.x * positionImpulse *
          (positionDampen / bodyA.totalContacts);
        bodyA.positionImpulse.y += normal.y * positionImpulse *
          (positionDampen / bodyA.totalContacts);
      }

      if (!(bodyB.isStatic || bodyB.isSleeping)) {
        bodyB.positionImpulse.x -= normal.x * positionImpulse *
          (positionDampen / bodyB.totalContacts);
        bodyB.positionImpulse.y -= normal.y * positionImpulse *
          (positionDampen / bodyB.totalContacts);
      }
    }
  }

  static postSolvePosition(bodies: IBody[]) {
    const positionWarming = Resolver.#positionWarming;
    const verticesTranslate = Vertices.translate;
    const boundsUpdate = Bounds.update;

    for (const body of bodies) {
      const positionImpulse = body.positionImpulse;
      const positionImpulseX = positionImpulse.x;
      const positionImpulseY = positionImpulse.y;
      const velocity = body.velocity;

      body.totalContacts = 0;

      if (positionImpulseX !== 0 || positionImpulseY !== 0) {
        for (const part of body.parts) {
          verticesTranslate(part.vertices, positionImpulse);
          boundsUpdate(part.bounds, part.vertices, velocity);
          part.position.x += positionImpulseX;
          part.position.y += positionImpulseY;
        }

        body.positionPrev!.x += positionImpulseX;
        body.positionPrev!.y += positionImpulseY;

        if (positionImpulseX * velocity.x + positionImpulseY * velocity.y < 0) {
          positionImpulse.x = 0;
          positionImpulse.y = 0;
        } else {
          positionImpulse.x *= positionWarming;
          positionImpulse.y *= positionWarming;
        }
      }
    }
  }

  static preSolveVelocity(pairs: IPair[]): void {
    for (const pair of pairs) {
      if (!pair.isActive || pair.isSensor) {
        continue;
      }

      const contacts = pair.activeContacts;
      const collision = pair.collision;
      const bodyA = collision.parentA;
      const bodyB = collision.parentB;
      const normal = collision.normal;
      const tangent = collision.tangent;

      // resolve each contact
      for (const contact of contacts) {
        const contactVertex = contact.vertex;
        const normalImpulse = contact.normalImpulse;
        const tangentImpulse = contact.tangentImpulse;

        if (normalImpulse !== 0 || tangentImpulse !== 0) {
          const impulseX = normal.x * normalImpulse +
            tangent.x * tangentImpulse;
          const impulseY = normal.y * normalImpulse +
            tangent.y * tangentImpulse;

          // apply impulse from contact
          if (!(bodyA.isStatic || bodyA.isSleeping)) {
            bodyA.positionPrev.x += impulseX * bodyA.inverseMass;
            bodyA.positionPrev.y += impulseY * bodyA.inverseMass;
            bodyA.anglePrev += bodyA.inverseInertia * (
              (contactVertex.x - bodyA.position.x) * impulseY -
              (contactVertex.y - bodyA.position.y) * impulseX
            );
          }

          if (!(bodyB.isStatic || bodyB.isSleeping)) {
            bodyB.positionPrev.x -= impulseX * bodyB.inverseMass;
            bodyB.positionPrev.y -= impulseY * bodyB.inverseMass;
            bodyB.anglePrev -= bodyB.inverseInertia * (
              (contactVertex.x - bodyB.position.x) * impulseY -
              (contactVertex.y - bodyB.position.y) * impulseX
            );
          }
        }
      }
    }
  }
}

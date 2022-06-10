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
  static solveVelocity(pairs: IPair[], timeScale: number) {
    const timeScaleSquared = timeScale * timeScale;
    const restingThresh = Resolver.#restingThresh * timeScaleSquared;
    const frictionNormalMultiplier = Resolver.#frictionNormalMultiplier;
    const restingThreshTangent = Resolver.#restingThreshTangent *
      timeScaleSquared;
    const NumberMaxValue = Number.MAX_VALUE;
    let tangentImpulse;
    let maxFriction;

    for (const pair of pairs) {
      if (!pair.isActive || pair.isSensor) {
        continue;
      }

      const collision = pair.collision;
      const bodyA = collision.parentA;
      const bodyB = collision.parentB;
      const bodyAVelocity = bodyA.velocity;
      const bodyBVelocity = bodyB.velocity;
      const normalX = collision.normal.x;
      const normalY = collision.normal.y;
      const tangentX = collision.tangent.x;
      const tangentY = collision.tangent.y;
      const contacts = pair.activeContacts;
      const contactsLength = contacts.length;
      const contactShare = 1 / contactsLength;
      const inverseMassTotal = bodyA.inverseMass + bodyB.inverseMass;
      const friction = pair.friction * pair.frictionStatic *
        frictionNormalMultiplier * timeScaleSquared;

      bodyAVelocity.x = bodyA.position.x - bodyA.positionPrev.x;
      bodyAVelocity.y = bodyA.position.y - bodyA.positionPrev.y;
      bodyBVelocity.x = bodyB.position.x - bodyB.positionPrev.x;
      bodyBVelocity.y = bodyB.position.y - bodyB.positionPrev.y;
      bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
      bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

      for (const contact of contacts) {
        const contactVertex = contact.vertex;

        const offsetAX = contactVertex.x - bodyA.position.x;
        const offsetAY = contactVertex.y - bodyA.position.y;
        const offsetBX = contactVertex.x - bodyB.position.x;
        const offsetBY = contactVertex.y - bodyB.position.y;

        const velocityPointAX = bodyAVelocity.x -
          offsetAY * bodyA.angularVelocity;
        const velocityPointAY = bodyAVelocity.y +
          offsetAX * bodyA.angularVelocity;
        const velocityPointBX = bodyBVelocity.x -
          offsetBY * bodyB.angularVelocity;
        const velocityPointBY = bodyBVelocity.y +
          offsetBX * bodyB.angularVelocity;

        const relativeVelocityX = velocityPointAX - velocityPointBX;
        const relativeVelocityY = velocityPointAY - velocityPointBY;

        const normalVelocity = normalX * relativeVelocityX +
          normalY * relativeVelocityY;
        const tangentVelocity = tangentX * relativeVelocityX +
          tangentY * relativeVelocityY;

        const normalOverlap = pair.separation + normalVelocity;
        let normalForce = Math.min(normalOverlap, 1);
        normalForce = normalOverlap < 0 ? 0 : normalForce;

        const frictionLimit = normalForce * friction;

        if (
          tangentVelocity > frictionLimit || -tangentVelocity > frictionLimit
        ) {
          maxFriction = tangentVelocity > 0
            ? tangentVelocity
            : -tangentVelocity;
          tangentImpulse = pair.friction * (tangentVelocity > 0 ? 1 : -1) *
            timeScaleSquared;

          if (tangentImpulse < -maxFriction) {
            tangentImpulse = -maxFriction;
          } else if (tangentImpulse > maxFriction) {
            tangentImpulse = maxFriction;
          }
        } else {
          tangentImpulse = tangentVelocity;
          maxFriction = NumberMaxValue;
        }

        const oAcN = offsetAX * normalY - offsetAY * normalX;
        const oBcN = offsetBX * normalY - offsetBY * normalX;
        const share = contactShare /
          (inverseMassTotal + bodyA.inverseInertia * oAcN * oAcN +
            bodyB.inverseInertia * oBcN * oBcN);

        let normalImpulse = (1 + pair.restitution) * normalVelocity * share;
        tangentImpulse *= share;

        if (
          normalVelocity * normalVelocity > restingThresh && normalVelocity < 0
        ) {
          contact.normalImpulse = 0;
        } else {
          const contactNormalImpulse = contact.normalImpulse;
          contact.normalImpulse += normalImpulse;
          contact.normalImpulse = Math.min(contact.normalImpulse, 0);
          normalImpulse = contact.normalImpulse - contactNormalImpulse;
        }

        if (tangentVelocity * tangentVelocity > restingThreshTangent) {
          contact.tangentImpulse = 0;
        } else {
          const contactTangentImpulse = contact.tangentImpulse;
          contact.tangentImpulse += tangentImpulse;
          if (contact.tangentImpulse < -maxFriction) {
            contact.tangentImpulse = -maxFriction;
          }
          if (contact.tangentImpulse > maxFriction) {
            contact.tangentImpulse = maxFriction;
          }
          tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
        }

        const impulseX = normalX * normalImpulse + tangentX * tangentImpulse;
        const impulseY = normalY * normalImpulse + tangentY * tangentImpulse;

        if (!(bodyA.isStatic || bodyA.isSleeping)) {
          bodyA.positionPrev.x += impulseX * bodyA.inverseMass;
          bodyA.positionPrev.y += impulseY * bodyA.inverseMass;
          bodyA.anglePrev += (offsetAX * impulseY - offsetAY * impulseX) *
            bodyA.inverseInertia;
        }

        if (!(bodyB.isStatic || bodyB.isSleeping)) {
          bodyB.positionPrev.x -= impulseX * bodyB.inverseMass;
          bodyB.positionPrev.y -= impulseY * bodyB.inverseMass;
          bodyB.anglePrev -= (offsetBX * impulseY - offsetBY * impulseX) *
            bodyB.inverseInertia;
        }
      }
    }
  }
}

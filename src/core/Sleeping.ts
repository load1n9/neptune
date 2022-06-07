import { Events } from "./Events.ts";

export class Sleeping {
  static _motionWakeThreshold = 0.18;
  static _motionSleepThreshold = 0.08;
  static _minBias = 0.9;

  // deno-lint-ignore no-explicit-any
  static update(bodies: any, timeScale: number) {
    const timeFactor = timeScale * timeScale * timeScale;

    // update bodies sleeping status
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const motion = body.speed * body.speed +
        body.angularSpeed * body.angularSpeed;

      // wake up bodies if they have a force applied
      if (body.force.x !== 0 || body.force.y !== 0) {
        Sleeping.set(body, false);
        continue;
      }

      const minMotion = Math.min(body.motion, motion);
      const maxMotion = Math.max(body.motion, motion);

      body.motion = Sleeping._minBias * minMotion +
        (1 - Sleeping._minBias) * maxMotion;

      if (
        body.sleepThreshold > 0 &&
        body.motion < Sleeping._motionSleepThreshold * timeFactor
      ) {
        body.sleepCounter += 1;

        if (body.sleepCounter >= body.sleepThreshold) {
          Sleeping.set(body, true);
        }
      } else if (body.sleepCounter > 0) {
        body.sleepCounter -= 1;
      }
    }
  }
  // deno-lint-ignore no-explicit-any
  static afterCollisions(pairs: any[], timeScale: number) {
    const timeFactor = timeScale * timeScale * timeScale;
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair.isActive) {
        continue;
      }
      const collision = pair.collision;
      const bodyA = collision.bodyA.parent;
      const bodyB = collision.bodyB.parent;

      // don't wake if at least one body is static
      if (
        (bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic ||
        bodyB.isStatic
      ) {
        continue;
      }

      if (bodyA.isSleeping || bodyB.isSleeping) {
        const sleepingBody = (bodyA.isSleeping && !bodyA.isStatic)
          ? bodyA
          : bodyB;
        const movingBody = sleepingBody === bodyA ? bodyB : bodyA;

        if (
          !sleepingBody.isStatic &&
          movingBody.motion > Sleeping._motionWakeThreshold * timeFactor
        ) {
          Sleeping.set(sleepingBody, false);
        }
      }
    }
  }
  // deno-lint-ignore no-explicit-any
  static set(body: any, isSleeping?: boolean) {
    const wasSleeping = body.isSleeping;

    if (isSleeping) {
      body.isSleeping = true;
      body.sleepCounter = body.sleepThreshold;

      body.positionImpulse.x = 0;
      body.positionImpulse.y = 0;

      body.positionPrev.x = body.position.x;
      body.positionPrev.y = body.position.y;

      body.anglePrev = body.angle;
      body.speed = 0;
      body.angularSpeed = 0;
      body.motion = 0;

      if (!wasSleeping) {
        Events.trigger(body, "sleepStart");
      }
    } else {
      body.isSleeping = false;
      body.sleepCounter = 0;

      if (wasSleeping) {
        Events.trigger(body, "sleepEnd");
      }
    }
  }
}

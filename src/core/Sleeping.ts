import { IBody } from "../types.ts";
import { Events } from "./Events.ts";

export class Sleeping {
  static _motionWakeThreshold = 0.18;
  static _motionSleepThreshold = 0.08;
  static _minBias = 0.9;

  static update(bodies: IBody[], timeScale: number) {
    const timeFactor = timeScale * timeScale * timeScale;
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const motion = body.speed * body.speed +
        body.angularSpeed * body.angularSpeed;
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
        body.sleepCounter! += 1;

        if (body.sleepCounter! >= body.sleepThreshold) {
          Sleeping.set(body, true);
        }
      } else if (body.sleepCounter! > 0) {
        body.sleepCounter! -= 1;
      }
    }
  }
// deno-lint-ignore no-explicit-any
afterCollisions(pairs: any[], timeScale: number) {
        const timeFactor = timeScale * timeScale * timeScale;

        // wake up bodies involved in collisions
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // don't wake inactive pairs
            if (!pair.isActive)
                continue;

            var collision = pair.collision,
                bodyA = collision.bodyA.parent, 
                bodyB = collision.bodyB.parent;
        
            // don't wake if at least one body is static
            if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
                continue;
        
            if (bodyA.isSleeping || bodyB.isSleeping) {
                var sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                    movingBody = sleepingBody === bodyA ? bodyB : bodyA;

                if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) {
                    Sleeping.set(sleepingBody, false);
                }
            }
        }
    };
}

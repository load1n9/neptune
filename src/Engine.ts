import { Common } from "./core/Common.ts";
import { Composite } from "./body/Composite.ts";
import { Detector } from "./collision/Detector.ts";
import { Pairs } from "./collision/Pairs.ts";
import { Events } from "./core/Events.ts";
import { Sleeping } from "./core/Sleeping.ts";
import { Constraint } from "./constraint/Constraint.ts";
import { Resolver } from "./collision/Resolver.ts";
import { IBody, IBounds } from "./types.ts";
import { Body } from "./body/Body.ts";
// import type { IEngine } from "./types.ts";

export class Engine {
  // deno-lint-ignore no-explicit-any
  static create(options: any = {}): any {
    const defaults = {
      positionIterations: 6,
      velocityIterations: 4,
      constraintIterations: 2,
      enableSleeping: false,
      events: [],
      plugin: {},
      gravity: {
        x: 0,
        y: 1,
        scale: 0.001,
      },
      timing: {
        timestamp: 0,
        timeScale: 1,
        lastDelta: 0,
        lastElapsed: 0,
      },
    };

    const engine = Common.extend(defaults, options);

    engine.world = options.world || Composite.create({ label: "World" });
    engine.pairs = options.pairs || Pairs.create();
    engine.detector = options.detector || Detector.create();
    engine.grid = { buckets: [] };
    engine.world.gravity = engine.gravity;
    engine.broadphase = engine.grid;
    engine.metrics = {};
    return engine;
  }

  // deno-lint-ignore no-explicit-any
  static update(engine: any, delta = 1000 / 60, correction = 1) {
    const startTime = Common.now();
    const world = engine.world;
    const detector = engine.detector;
    const pairs = engine.pairs;
    const timing = engine.timing;
    const timestamp = timing.timestamp;
    let i;

    timing.timestamp += delta * timing.timeScale;
    timing.lastDelta = delta * timing.timeScale;

    const event = {
      timestamp: timing.timestamp,
    };

    Events.trigger(engine, "beforeUpdate", event);

    const allBodies = Composite.allBodies(world);
    const allConstraints = Composite.allConstraints(world);

    if (world.isModified) {
      Detector.setBodies(detector, allBodies);
    }

    if (world.isModified) {
      Composite.setModified(world, false, false, true);
    }

    if (engine.enableSleeping) {
      Sleeping.update(allBodies, timing.timeScale);
    }

    Engine.#bodiesApplyGravity(allBodies, engine.gravity);

    Engine.#bodiesUpdate(
      allBodies,
      delta,
      timing.timeScale,
      correction,
      world.bounds,
    );

    Constraint.preSolveAll(allBodies);
    for (i = 0; i < engine.constraintIterations; i++) {
      Constraint.solveAll(allConstraints, timing.timeScale);
    }
    Constraint.postSolveAll(allBodies);

    detector.pairs = engine.pairs;
    const collisions = Detector.collisions(detector);

    Pairs.update(pairs, collisions, timestamp);
    if (engine.enableSleeping) {
      Sleeping.afterCollisions(pairs.list, timing.timeScale);
    }

    if (pairs.collisionStart.length > 0) {
      Events.trigger(engine, "collisionStart", { pairs: pairs.collisionStart });
    }

    Resolver.preSolvePosition(pairs.list);
    for (i = 0; i < engine.positionIterations; i++) {
      Resolver.solvePosition(pairs.list, timing.timeScale);
    }
    Resolver.postSolvePosition(allBodies);

    // update all constraints (second pass)
    Constraint.preSolveAll(allBodies);
    for (i = 0; i < engine.constraintIterations; i++) {
      Constraint.solveAll(allConstraints, timing.timeScale);
    }
    Constraint.postSolveAll(allBodies);

    // iteratively resolve velocity between collisions
    Resolver.preSolveVelocity(pairs.list);
    for (i = 0; i < engine.velocityIterations; i++) {
      Resolver.solveVelocity(pairs.list, timing.timeScale);
    }

    // trigger collision events
    if (pairs.collisionActive.length > 0) {
      Events.trigger(engine, "collisionActive", {
        pairs: pairs.collisionActive,
      });
    }

    if (pairs.collisionEnd.length > 0) {
      Events.trigger(engine, "collisionEnd", { pairs: pairs.collisionEnd });
    }

    // clear force buffers
    Engine.#bodiesClearForces(allBodies);

    Events.trigger(engine, "afterUpdate", event);

    // log the time elapsed computing this update
    engine.timing.lastElapsed = Common.now() - startTime;

    return engine;
  }
  // deno-lint-ignore no-explicit-any
  static merge(engineA: any, engineB: any) {
    Common.extend(engineA, engineB);

    if (engineB.world) {
      engineA.world = engineB.world;

      Engine.clear(engineA);

      const bodies = Composite.allBodies(engineA.world);

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        Sleeping.set(body, false);
        body.id = Common.nextId();
      }
    }
  }
  // deno-lint-ignore no-explicit-any
  static clear(engine: any) {
    Pairs.clear(engine.pairs);
    Detector.clear(engine.detector);
  }
  static #bodiesClearForces(bodies: IBody[]) {
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      body.force.x = 0;
      body.force.y = 0;
      body.torque = 0;
    }
  }
  // deno-lint-ignore no-explicit-any
  static #bodiesApplyGravity(bodies: IBody[], gravity: any) {
    const gravityScale = typeof gravity.scale !== "undefined"
      ? gravity.scale
      : 0.001;

    if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
      return;
    }

    for (const body of bodies) {
      if (body.isStatic || body.isSleeping) {
        continue;
      }

      body.force.y += body.mass * gravity.y * gravityScale;
      body.force.x += body.mass * gravity.x * gravityScale;
    }
  }
  static #bodiesUpdate(
    bodies: IBody[],
    deltaTime: number,
    timeScale: number,
    correction: number,
    _worldBounds: IBounds,
  ) {
    for (const body of bodies) {
      if (body.isStatic || body.isSleeping) {
        continue;
      }
      Body.update(body, deltaTime, timeScale, correction);
    }
  }
}

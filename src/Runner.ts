import { Common } from "./core/Common.ts";
import { Events } from "./core/Events.ts";
import { Engine } from "./Engine.ts";

let _frameTimeout: number;

// deno-lint-ignore no-explicit-any
const requestAnimationFrame = (callback: any) => {
  _frameTimeout = setTimeout(() => {
    callback(Common.now());
  }, 1000 / 60);
};

const cancelAnimationFrame = (__frameTimeout: number) => {
  clearTimeout(_frameTimeout);
};

export class Runner {
  // deno-lint-ignore no-explicit-any
  static create(options: any = {}) {
    const runner = Common.extend({
      fps: 60,
      correction: 1,
      deltaSampleSize: 60,
      counterTimestamp: 0,
      frameCounter: 0,
      deltaHistory: [],
      timePrev: null,
      timeScalePrev: 1,
      frameRequestId: null,
      isFixed: false,
      enabled: true,
    }, options);
    runner.delta = runner.delta || 1000 / runner.fps;
    runner.deltaMin = runner.deltaMin || 1000 / runner.fps;
    runner.deltaMax = runner.deltaMax || 1000 / (runner.fps * 0.5);
    runner.fps = 1000 / runner.delta;

    return runner;
  }

  // deno-lint-ignore no-explicit-any
  static run(runner: any, engine: any) {
    // create runner if engine is first argument
    if (typeof runner.positionIterations !== "undefined") {
      engine = runner;
      runner = Runner.create();
    }

    (function render(time) {
      runner.frameRequestId = requestAnimationFrame(render);

      if (time && runner.enabled) {
        Runner.tick(runner, engine, time);
      }
    })();

    return runner;
  }
  // deno-lint-ignore no-explicit-any
  static tick(runner: any, engine: any, time: number) {
    const timing = engine.timing;
    let correction = 1;
    let delta;

    const event = {
      timestamp: timing.timestamp,
    };

    Events.trigger(runner, "beforeTick", event);

    if (runner.isFixed) {
      delta = runner.delta;
    } else {
      delta = (time - runner.timePrev) || runner.delta;
      runner.timePrev = time;

      runner.deltaHistory.push(delta);
      runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize);
      delta = Math.min.apply(null, runner.deltaHistory);

      delta = delta < runner.deltaMin ? runner.deltaMin : delta;
      delta = delta > runner.deltaMax ? runner.deltaMax : delta;

      correction = delta / runner.delta;

      runner.delta = delta;
    }

    if (runner.timeScalePrev !== 0) {
      correction *= timing.timeScale / runner.timeScalePrev;
    }

    if (timing.timeScale === 0) {
      correction = 0;
    }

    runner.timeScalePrev = timing.timeScale;
    runner.correction = correction;

    runner.frameCounter += 1;
    if (time - runner.counterTimestamp >= 1000) {
      runner.fps = runner.frameCounter *
        ((time - runner.counterTimestamp) / 1000);
      runner.counterTimestamp = time;
      runner.frameCounter = 0;
    }

    Events.trigger(runner, "tick", event);

    Events.trigger(runner, "beforeUpdate", event);
    Engine.update(engine, delta, correction);
    Events.trigger(runner, "afterUpdate", event);

    Events.trigger(runner, "afterTick", event);
  }

  // deno-lint-ignore no-explicit-any
  static stop(runner: any) {
    cancelAnimationFrame(runner.frameRequestId);
  }
  // deno-lint-ignore no-explicit-any
  static start(runner: any, engine: any) {
    Runner.run(runner, engine);
  }
}

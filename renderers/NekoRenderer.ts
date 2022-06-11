// deno-lint-ignore-file no-explicit-any no-case-declarations
import {
  Bounds,
  Common,
  Composite,
  Events,
  IBody,
  IPair,
  Vector,
} from "../mod.ts";
import {
  Canvas,
  loadImage,
} from "https://deno.land/x/neko@0.1.1/canvas/mod.ts";
const _mean = (values: number[]) => {
  let result = 0;
  for (const value of values) {
    result += value;
  }
  return (result / values.length) || 0;
};
let _frameTimeout: number;
const requestAnimationFrame = (callback: any) => {
  _frameTimeout = setTimeout(() => {
    callback(Common.now());
  }, 1000 / 60);
};

const cancelAnimationFrame = (_placeholder: any) => {
  clearTimeout(_frameTimeout);
};

export class NekoRenderer {
  static #goodFps = 30;
  static #goodDelta = 1000 / 60;

  static create(options: any) {
    const renderer = Common.extend({
      engine: null,
      element: null,
      canvas: null,
      mouse: null,
      frameRequestId: null,
      timing: {
        historySize: 60,
        delta: 0,
        deltaHistory: [],
        lastTime: 0,
        lastTimestamp: 0,
        lastElapsed: 0,
        timestampElapsed: 0,
        timestampElapsedHistory: [],
        engineDeltaHistory: [],
        engineElapsedHistory: [],
        elapsedHistory: [],
      },
      options: {
        width: 800,
        height: 600,
        pixelRatio: 1,
        background: "#14151f",
        wireframeBackground: "#14151f",
        hasBounds: !!options.bounds,
        enabled: true,
        wireframes: true,
        showSleeping: true,
        showDebug: false,
        showStats: false,
        showPerformance: false,
        showBounds: false,
        showVelocity: false,
        showCollisions: false,
        showSeparations: false,
        showAxes: false,
        showPositions: false,
        showAngleIndicator: false,
        showIds: false,
        showVertexNumbers: false,
        showConvexHulls: false,
        showInternalEdges: false,
        showMousePosition: false,
      },
    }, options);
    renderer.engine = options.engine;
    renderer.canvas = NekoRenderer.#createCanvas(
      renderer.options.width,
      renderer.options.height,
    );
    renderer.context = renderer.canvas.getContext("2d");
    renderer.textures = {};
    renderer.bounds = renderer.bounds || {
      min: {
        x: 0,
        y: 0,
      },
      max: {
        x: renderer.canvas.width,
        y: renderer.canvas.height,
      },
    };

    // for temporary back compatibility only
    renderer.controller = NekoRenderer;
    renderer.options.showBroadphase = false;

    if (renderer.options.pixelRatio !== 1) {
      NekoRenderer.setPixelRatio(renderer, renderer.options.pixelRatio);
    }
    return renderer;
  }

  static run(renderer: any) {
    (function loop(time = 1) {
      renderer.frameRequestId = requestAnimationFrame(loop);

      NekoRenderer.#updateTiming(renderer, time);

      NekoRenderer.world(renderer, time);

      if (renderer.options.showStats || renderer.options.showDebug) {
        NekoRenderer.stats(renderer, renderer.context, time);
      }

      if (renderer.options.showPerformance || renderer.options.showDebug) {
        NekoRenderer.performance(renderer, renderer.context, time);
      }
    })();
  }
  static stop(renderer: any) {
    cancelAnimationFrame(renderer.frameRequestId);
  }

  static setPixelRatio(render: any, pixelRatio: number | "auto" = "auto") {
    const options = render.options,
      canvas = render.canvas;

    if (pixelRatio === "auto") {
      pixelRatio = NekoRenderer.#getPixelRatio(canvas) as number;
    }

    options.pixelRatio = pixelRatio;
  }
  static lookAt(
    render: any,
    objects: any,
    padding = Vector.create(),
    center: any = true,
  ) {
    center = typeof center !== "undefined" ? center : true;
    objects = Common.isArray(objects) ? objects : [objects];
    padding = padding || {
      x: 0,
      y: 0,
    };

    const bounds = {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity },
    };

    for (let i = 0; i < objects.length; i += 1) {
      const object = objects[i],
        min = object.bounds
          ? object.bounds.min
          : (object.min || object.position || object),
        max = object.bounds
          ? object.bounds.max
          : (object.max || object.position || object);

      if (min && max) {
        if (min.x < bounds.min.x) {
          bounds.min.x = min.x;
        }

        if (max.x > bounds.max.x) {
          bounds.max.x = max.x;
        }

        if (min.y < bounds.min.y) {
          bounds.min.y = min.y;
        }

        if (max.y > bounds.max.y) {
          bounds.max.y = max.y;
        }
      }
    }

    const width = (bounds.max.x - bounds.min.x) + 2 * padding.x;
    const height = (bounds.max.y - bounds.min.y) + 2 * padding.y;
    const viewHeight = render.canvas.height;
    const viewWidth = render.canvas.width;
    const outerRatio = viewWidth / viewHeight;
    const innerRatio = width / height;
    let scaleX = 1;
    let scaleY = 1;
    if (innerRatio > outerRatio) {
      scaleY = innerRatio / outerRatio;
    } else {
      scaleX = outerRatio / innerRatio;
    }
    render.options.hasBounds = true;

    render.bounds.min.x = bounds.min.x;
    render.bounds.max.x = bounds.min.x + width * scaleX;
    render.bounds.min.y = bounds.min.y;
    render.bounds.max.y = bounds.min.y + height * scaleY;
    if (center) {
      render.bounds.min.x += width * 0.5 - (width * scaleX) * 0.5;
      render.bounds.max.x += width * 0.5 - (width * scaleX) * 0.5;
      render.bounds.min.y += height * 0.5 - (height * scaleY) * 0.5;
      render.bounds.max.y += height * 0.5 - (height * scaleY) * 0.5;
    }
    render.bounds.min.x -= padding.x;
    render.bounds.max.x -= padding.x;
    render.bounds.min.y -= padding.y;
    render.bounds.max.y -= padding.y;
  }
  static startViewTransform(render: any) {
    const boundsWidth = render.bounds.max.x - render.bounds.min.x,
      boundsHeight = render.bounds.max.y - render.bounds.min.y,
      boundsScaleX = boundsWidth / render.options.width,
      boundsScaleY = boundsHeight / render.options.height;

    render.context.setTransform(
      render.options.pixelRatio / boundsScaleX,
      0,
      0,
      render.options.pixelRatio / boundsScaleY,
      0,
      0,
    );

    render.context.translate(-render.bounds.min.x, -render.bounds.min.y);
  }

  static endViewTransform(render: any) {
    render.context.setTransform(
      render.options.pixelRatio,
      0,
      0,
      render.options.pixelRatio,
      0,
      0,
    );
  }

  static world(render: any, _time?: number) {
    const startTime = Common.now(),
      engine = render.engine,
      world = engine.world,
      canvas = render.canvas,
      context = render.context,
      options = render.options,
      timing = render.timing;

    const allBodies = Composite.allBodies(world),
      allConstraints = Composite.allConstraints(world),
      background = options.wireframes
        ? options.wireframeBackground
        : options.background;
    let bodies = [];
    let constraints = [];
    let i;

    const event = {
      timestamp: engine.timing.timestamp,
    };

    Events.trigger(render, "beforeRender", event);

    // apply background if it has changed
    if (render.currentBackground !== background) {
      NekoRenderer.#applyBackground(render, background);
    }

    // clear the canvas with a transparent fill, to allow the canvas background to show
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "transparent";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";

    // handle bounds
    if (options.hasBounds) {
      // filter out bodies that are not in view
      for (i = 0; i < allBodies.length; i++) {
        const body = allBodies[i];
        if (Bounds.overlaps(body.bounds, render.bounds)) {
          bodies.push(body);
        }
      }

      // filter out constraints that are not in view
      for (i = 0; i < allConstraints.length; i++) {
        const constraint = allConstraints[i];
        const bodyA = constraint.bodyA;
        const bodyB = constraint.bodyB;
        let pointAWorld = constraint.pointA;
        let pointBWorld = constraint.pointB;

        if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
        if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

        if (!pointAWorld || !pointBWorld) {
          continue;
        }

        if (
          Bounds.contains(render.bounds, pointAWorld) ||
          Bounds.contains(render.bounds, pointBWorld)
        ) {
          constraints.push(constraint);
        }
      }

      // transform the view
      NekoRenderer.startViewTransform(render);
    } else {
      constraints = allConstraints;
      bodies = allBodies;

      if (render.options.pixelRatio !== 1) {
        render.context.setTransform(
          render.options.pixelRatio,
          0,
          0,
          render.options.pixelRatio,
          0,
          0,
        );
      }
    }

    if (
      !options.wireframes || (engine.enableSleeping && options.showSleeping)
    ) {
      // fully featured rendering of bodies
      NekoRenderer.bodies(render, bodies, context);
    } else {
      if (options.showConvexHulls) {
        NekoRenderer.bodyConvexHulls(render, bodies, context);
      }

      // optimised method for wireframes only
      NekoRenderer.bodyWireframes(render, bodies, context);
    }

    if (options.showBounds) {
      NekoRenderer.bodyBounds(render, bodies, context);
    }

    if (options.showAxes || options.showAngleIndicator) {
      NekoRenderer.bodyAxes(render, bodies, context);
    }

    if (options.showPositions) {
      NekoRenderer.bodyPositions(render, bodies, context);
    }

    if (options.showVelocity) {
      NekoRenderer.bodyVelocity(render, bodies, context);
    }

    if (options.showIds) {
      NekoRenderer.bodyIds(render, bodies, context);
    }

    if (options.showSeparations) {
      NekoRenderer.separations(render, engine.pairs.list, context);
    }

    if (options.showCollisions) {
      NekoRenderer.collisions(render, engine.pairs.list, context);
    }

    if (options.showVertexNumbers) {
      NekoRenderer.vertexNumbers(render, bodies, context);
    }

    NekoRenderer.constraints(constraints, context);

    if (options.hasBounds) {
      NekoRenderer.endViewTransform(render);
    }

    Events.trigger(render, "afterRender", event);
    timing.lastElapsed = Common.now() - startTime;
  }
  static stats(render: any, context: any, _time?: number) {
    const engine = render.engine;
    const world = engine.world;
    const bodies = Composite.allBodies(world);
    let parts = 0;
    const width = 55;
    const height = 44;
    let x = 0;
    const y = 0;

    // count parts
    for (let i = 0; i < bodies.length; i += 1) {
      parts += bodies[i].parts.length;
    }
    const sections: any = {
      "Part": parts,
      "Body": bodies.length,
      "Cons": Composite.allConstraints(world).length,
      "Comp": Composite.allComposites(world).length,
      "Pair": engine.pairs.list.length,
    };

    // background
    context.fillStyle = "#0e0f19";
    context.fillRect(x, y, width * 5.5, height);

    context.font = "12px Arial";
    context.textBaseline = "top";
    context.textAlign = "right";

    // sections
    for (const key of sections) {
      const section = sections[key];
      // label
      context.fillStyle = "#aaa";
      context.fillText(key, x + width, y + 8);

      // value
      context.fillStyle = "#eee";
      context.fillText(section, x + width, y + 26);

      x += width;
    }
  }
  static performance(render: any, context: any, _time: number) {
    const engine = render.engine,
      timing = render.timing,
      deltaHistory = timing.deltaHistory,
      elapsedHistory = timing.elapsedHistory,
      timestampElapsedHistory = timing.timestampElapsedHistory,
      engineDeltaHistory = timing.engineDeltaHistory,
      engineElapsedHistory = timing.engineElapsedHistory,
      lastEngineDelta = engine.timing.lastDelta;

    const deltaMean = _mean(deltaHistory),
      elapsedMean = _mean(elapsedHistory),
      engineDeltaMean = _mean(engineDeltaHistory),
      engineElapsedMean = _mean(engineElapsedHistory),
      timestampElapsedMean = _mean(timestampElapsedHistory),
      rateMean = (timestampElapsedMean / deltaMean) || 0,
      fps = (1000 / deltaMean) || 0;

    const graphHeight = 4,
      gap = 12,
      width = 60,
      height = 34,
      x = 10,
      y = 69;

    // background
    context.fillStyle = "#0e0f19";
    context.fillRect(0, 50, gap * 4 + width * 5 + 22, height);

    // show FPS
    NekoRenderer.status(
      context,
      x,
      y,
      width,
      graphHeight,
      deltaHistory.length,
      Math.round(fps) + " fps",
      fps / NekoRenderer.#goodFps,
      (i: number) => (deltaHistory[i] / deltaMean) - 1,
    );

    // show engine delta
    NekoRenderer.status(
      context,
      x + gap + width,
      y,
      width,
      graphHeight,
      engineDeltaHistory.length,
      lastEngineDelta.toFixed(2) + " dt",
      NekoRenderer.#goodDelta / lastEngineDelta,
      (i: number) => (engineDeltaHistory[i] / engineDeltaMean) - 1,
    );

    // show engine update time
    NekoRenderer.status(
      context,
      x + (gap + width) * 2,
      y,
      width,
      graphHeight,
      engineElapsedHistory.length,
      engineElapsedMean.toFixed(2) + " ut",
      1 - (engineElapsedMean / NekoRenderer.#goodFps),
      (i: number) => (engineElapsedHistory[i] / engineElapsedMean) - 1,
    );

    // show render time
    NekoRenderer.status(
      context,
      x + (gap + width) * 3,
      y,
      width,
      graphHeight,
      elapsedHistory.length,
      elapsedMean.toFixed(2) + " rt",
      1 - (elapsedMean / NekoRenderer.#goodFps),
      (i: number) => (elapsedHistory[i] / elapsedMean) - 1,
    );

    // show effective speed
    NekoRenderer.status(
      context,
      x + (gap + width) * 4,
      y,
      width,
      graphHeight,
      timestampElapsedHistory.length,
      rateMean.toFixed(2) + " x",
      rateMean * rateMean * rateMean,
      (i: number) =>
        (((timestampElapsedHistory[i] / deltaHistory[i]) / rateMean) || 0) - 1,
    );
  }

  static status(
    context: any,
    x: number,
    y: number,
    width: number,
    height: number,
    count: number,
    label: string,
    indicator: number,
    plotY: any,
  ) {
    // background
    context.strokeStyle = "#888";
    context.fillStyle = "#444";
    context.lineWidth = 1;
    context.fillRect(x, y + 7, width, 1);

    // chart
    context.beginPath();
    context.moveTo(x, y + 7 - height * Common.clamp(0.4 * plotY(0), -2, 2));
    for (let i = 0; i < width; i += 1) {
      context.lineTo(
        x + i,
        y + 7 - (i < count ? height * Common.clamp(0.4 * plotY(i), -2, 2) : 0),
      );
    }
    context.stroke();

    // indicator
    context.fillStyle = "hsl(" + Common.clamp(25 + 95 * indicator, 0, 120) +
      ",100%,60%)";
    context.fillRect(x, y - 7, 4, 4);

    // label
    context.font = "12px Arial";
    context.textBaseline = "middle";
    context.textAlign = "right";
    context.fillStyle = "#eee";
    context.fillText(label, x + width, y - 5);
  }

  static constraints(constraints: any, context: any) {
    const c = context;

    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];

      if (
        !constraint.render.visible || !constraint.pointA || !constraint.pointB
      ) {
        continue;
      }

      const bodyA = constraint.bodyA;
      const bodyB = constraint.bodyB;
      let start;
      let end;

      if (bodyA) {
        start = Vector.add(bodyA.position, constraint.pointA);
      } else {
        start = constraint.pointA;
      }

      if (constraint.render.type === "pin") {
        c.beginPath();
        c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        c.closePath();
      } else {
        if (bodyB) {
          end = Vector.add(bodyB.position, constraint.pointB);
        } else {
          end = constraint.pointB;
        }

        c.beginPath();
        c.moveTo(start.x, start.y);

        if (constraint.render.type === "spring") {
          const delta = Vector.subtract(end, start);
          const normal = Vector.perpendicular(Vector.normalize(delta));
          const coils = Math.ceil(Common.clamp(constraint.length / 5, 12, 20));
          let offset;

          for (let j = 1; j < coils; j += 1) {
            offset = j % 2 === 0 ? 1 : -1;

            c.lineTo(
              start.x + delta.x * (j / coils) + normal.x * offset * 4,
              start.y + delta.y * (j / coils) + normal.y * offset * 4,
            );
          }
        }

        c.lineTo(end.x, end.y);
      }

      if (constraint.render.lineWidth) {
        c.lineWidth = constraint.render.lineWidth;
        c.strokeStyle = constraint.render.strokeStyle;
        c.stroke();
      }

      if (constraint.render.anchors) {
        c.fillStyle = constraint.render.strokeStyle;
        c.beginPath();
        c.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        c.arc(end.x, end.y, 3, 0, 2 * Math.PI);
        c.closePath();
        c.fill();
      }
    }
  }

  static async bodies(render: any, bodies: IBody[], context: any) {
    const c = context,
      _engine = render.engine,
      options = render.options,
      showInternalEdges = options.showInternalEdges || !options.wireframes;
    let body,
      part,
      i,
      k;

    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.render.visible) {
        continue;
      }

      // handle compound parts
      for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        part = body.parts[k];

        if (!part.render.visible) {
          continue;
        }

        if (options.showSleeping && body.isSleeping) {
          c.globalAlpha = 0.5 * part.render.opacity;
        } else if (part.render.opacity !== 1) {
          c.globalAlpha = part.render.opacity;
        }

        if (
          part.render.sprite && part.render.sprite.texture &&
          !options.wireframes
        ) {
          // part sprite
          const sprite = part.render.sprite;
          const texture = await NekoRenderer.#getTexture(
            render,
            sprite.texture,
          );

          c.translate(part.position.x, part.position.y);
          c.rotate(part.angle);

          c.drawImage(
            texture,
            texture.width * -sprite.xOffset * sprite.xScale,
            texture.height * -sprite.yOffset * sprite.yScale,
            texture.width * sprite.xScale,
            texture.height * sprite.yScale,
          );

          // revert translation, hopefully faster than save / restore
          c.rotate(-part.angle);
          c.translate(-part.position.x, -part.position.y);
        } else {
          // part polygon
          if (part.circleRadius) {
            c.beginPath();
            c.arc(
              part.position.x,
              part.position.y,
              part.circleRadius,
              0,
              2 * Math.PI,
            );
          } else {
            c.beginPath();
            c.moveTo(part.vertices[0].x, part.vertices[0].y);

            for (let j = 1; j < part.vertices.length; j++) {
              if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                c.lineTo(part.vertices[j].x, part.vertices[j].y);
              } else {
                c.moveTo(part.vertices[j].x, part.vertices[j].y);
              }

              if (part.vertices[j].isInternal && !showInternalEdges) {
                c.moveTo(
                  part.vertices[(j + 1) % part.vertices.length].x,
                  part.vertices[(j + 1) % part.vertices.length].y,
                );
              }
            }

            c.lineTo(part.vertices[0].x, part.vertices[0].y);
            c.closePath();
          }

          if (!options.wireframes) {
            c.fillStyle = part.render.fillStyle;

            if (part.render.lineWidth) {
              c.lineWidth = part.render.lineWidth;
              c.strokeStyle = part.render.strokeStyle;
              c.stroke();
            }

            c.fill();
          } else {
            c.lineWidth = 1;
            c.strokeStyle = "#bbb";
            c.stroke();
          }
        }

        c.globalAlpha = 1;
      }
    }
  }
  static bodyWireframes(render: any, bodies: IBody[], context: any) {
    const c = context,
      showInternalEdges = render.options.showInternalEdges;
    let body,
      part,
      i,
      j,
      k;

    c.beginPath();

    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.render.visible) {
        continue;
      }

      for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
        part = body.parts[k];

        c.moveTo(part.vertices[0].x, part.vertices[0].y);

        for (j = 1; j < part.vertices.length; j++) {
          if (!part.vertices[j - 1].isInternal || showInternalEdges) {
            c.lineTo(part.vertices[j].x, part.vertices[j].y);
          } else {
            c.moveTo(part.vertices[j].x, part.vertices[j].y);
          }

          if (part.vertices[j].isInternal && !showInternalEdges) {
            c.moveTo(
              part.vertices[(j + 1) % part.vertices.length].x,
              part.vertices[(j + 1) % part.vertices.length].y,
            );
          }
        }

        c.lineTo(part.vertices[0].x, part.vertices[0].y);
      }
    }

    c.lineWidth = 1;
    c.strokeStyle = "#bbb";
    c.stroke();
  }

  static bodyConvexHulls(_render: any, bodies: IBody[], context: any) {
    const c = context;
    let body,
      _part,
      i,
      j,
      _k;

    c.beginPath();

    // render convex hulls
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.render.visible || body.parts.length === 1) {
        continue;
      }

      c.moveTo(body.vertices[0].x, body.vertices[0].y);

      for (j = 1; j < body.vertices.length; j++) {
        c.lineTo(body.vertices[j].x, body.vertices[j].y);
      }

      c.lineTo(body.vertices[0].x, body.vertices[0].y);
    }

    c.lineWidth = 1;
    c.strokeStyle = "rgba(255,255,255,0.2)";
    c.stroke();
  }

  static vertexNumbers(_render: any, bodies: IBody[], context: any) {
    const c = context;
    let i,
      j,
      k;

    for (i = 0; i < bodies.length; i++) {
      const parts = bodies[i].parts;
      for (k = parts.length > 1 ? 1 : 0; k < parts.length; k++) {
        const part = parts[k];
        for (j = 0; j < part.vertices.length; j++) {
          c.fillStyle = "rgba(255,255,255,0.2)";
          c.fillText(
            i + "_" + j,
            part.position.x + (part.vertices[j].x - part.position.x) * 0.8,
            part.position.y + (part.vertices[j].y - part.position.y) * 0.8,
          );
        }
      }
    }
  }
  static bodyBounds(render: any, bodies: IBody[], context: any) {
    const c = context,
      _engine = render.engine,
      options = render.options;

    c.beginPath();

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      if (body.render.visible) {
        const parts = bodies[i].parts;
        for (let j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          const part = parts[j];
          c.rect(
            part.bounds.min.x,
            part.bounds.min.y,
            part.bounds.max.x - part.bounds.min.x,
            part.bounds.max.y - part.bounds.min.y,
          );
        }
      }
    }

    if (options.wireframes) {
      c.strokeStyle = "rgba(255,255,255,0.08)";
    } else {
      c.strokeStyle = "rgba(0,0,0,0.1)";
    }

    c.lineWidth = 1;
    c.stroke();
  }

  static bodyAxes(render: any, bodies: IBody[], context: any) {
    const c = context,
      _engine = render.engine,
      options = render.options;
    let part,
      i,
      j,
      k;

    c.beginPath();

    for (i = 0; i < bodies.length; i++) {
      const body = bodies[i],
        parts = body.parts;

      if (!body.render.visible) {
        continue;
      }

      if (options.showAxes) {
        // render all axes
        for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          part = parts[j];
          for (k = 0; k < part.axes.length; k++) {
            const axis = part.axes[k];
            c.moveTo(part.position.x, part.position.y);
            c.lineTo(
              part.position.x + axis.x * 20,
              part.position.y + axis.y * 20,
            );
          }
        }
      } else {
        for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
          part = parts[j];
          for (k = 0; k < part.axes.length; k++) {
            // render a single axis indicator
            c.moveTo(part.position.x, part.position.y);
            c.lineTo(
              (part.vertices[0].x + part.vertices[part.vertices.length - 1].x) /
                2,
              (part.vertices[0].y + part.vertices[part.vertices.length - 1].y) /
                2,
            );
          }
        }
      }
    }

    if (options.wireframes) {
      c.strokeStyle = "indianred";
      c.lineWidth = 1;
    } else {
      c.strokeStyle = "rgba(255, 255, 255, 0.4)";
      c.globalCompositeOperation = "overlay";
      c.lineWidth = 2;
    }

    c.stroke();
    c.globalCompositeOperation = "source-over";
  }

  static bodyPositions(render: any, bodies: IBody[], context: any) {
    const c = context,
      _engine = render.engine,
      options = render.options;
    let body,
      part,
      i,
      k;

    c.beginPath();

    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];

      if (!body.render.visible) {
        continue;
      }

      for (k = 0; k < body.parts.length; k++) {
        part = body.parts[k];
        c.arc(part.position.x, part.position.y, 3, 0, 2 * Math.PI, false);
        c.closePath();
      }
    }

    if (options.wireframes) {
      c.fillStyle = "indianred";
    } else {
      c.fillStyle = "rgba(0,0,0,0.5)";
    }
    c.fill();

    c.beginPath();

    // render previous positions
    for (i = 0; i < bodies.length; i++) {
      body = bodies[i];
      if (body.render.visible) {
        c.arc(
          body.positionPrev!.x,
          body.positionPrev!.y,
          2,
          0,
          2 * Math.PI,
          false,
        );
        c.closePath();
      }
    }

    c.fillStyle = "rgba(255,165,0,0.8)";
    c.fill();
  }

  static bodyVelocity(_render: any, bodies: IBody[], context: any) {
    const c = context;

    c.beginPath();

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];

      if (!body.render.visible) {
        continue;
      }

      c.moveTo(body.position.x, body.position.y);
      c.lineTo(
        body.position.x + (body.position.x - body.positionPrev!.x) * 2,
        body.position.y + (body.position.y - body.positionPrev!.y) * 2,
      );
    }

    c.lineWidth = 3;
    c.strokeStyle = "cornflowerblue";
    c.stroke();
  }
  static bodyIds(_render: any, bodies: IBody[], context: any) {
    const c = context;
    let i,
      j;

    for (i = 0; i < bodies.length; i++) {
      if (!bodies[i].render.visible) {
        continue;
      }

      const parts = bodies[i].parts;
      for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
        const part = parts[j];
        c.font = "12px Arial";
        c.fillStyle = "rgba(255,255,255,0.5)";
        c.fillText(part.id, part.position.x + 10, part.position.y - 10);
      }
    }
  }
  static collisions(render: any, pairs: IPair[], context: any) {
    const c = context,
      options = render.options;
    let pair,
      collision,
      _corrected,
      _bodyA,
      _bodyB,
      i,
      j;

    c.beginPath();

    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive) {
        continue;
      }

      collision = pair.collision;
      for (j = 0; j < pair.activeContacts.length; j++) {
        const contact = pair.activeContacts[j],
          vertex = contact.vertex;
        c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
      }
    }

    if (options.wireframes) {
      c.fillStyle = "rgba(255,255,255,0.7)";
    } else {
      c.fillStyle = "orange";
    }
    c.fill();

    c.beginPath();
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive) {
        continue;
      }

      collision = pair.collision;

      if (pair.activeContacts.length > 0) {
        let normalPosX = pair.activeContacts[0].vertex.x,
          normalPosY = pair.activeContacts[0].vertex.y;

        if (pair.activeContacts.length === 2) {
          normalPosX = (pair.activeContacts[0].vertex.x +
            pair.activeContacts[1].vertex.x) / 2;
          normalPosY = (pair.activeContacts[0].vertex.y +
            pair.activeContacts[1].vertex.y) / 2;
        }

        if (
          collision.bodyB === collision.supports[0].body ||
          collision.bodyA.isStatic === true
        ) {
          c.moveTo(
            normalPosX - collision.normal.x * 8,
            normalPosY - collision.normal.y * 8,
          );
        } else {
          c.moveTo(
            normalPosX + collision.normal.x * 8,
            normalPosY + collision.normal.y * 8,
          );
        }

        c.lineTo(normalPosX, normalPosY);
      }
    }

    if (options.wireframes) {
      c.strokeStyle = "rgba(255,165,0,0.7)";
    } else {
      c.strokeStyle = "orange";
    }

    c.lineWidth = 1;
    c.stroke();
  }

  static separations(render: any, pairs: IPair[], context: any) {
    const c = context,
      options = render.options;
    let pair,
      collision,
      _corrected,
      bodyA,
      bodyB,
      i,
      _j;

    c.beginPath();

    // render separations
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];

      if (!pair.isActive) {
        continue;
      }

      collision = pair.collision;
      bodyA = collision.bodyA;
      bodyB = collision.bodyB;

      let k = 1;

      if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
      if (bodyB.isStatic) k = 0;

      c.moveTo(bodyB.position.x, bodyB.position.y);
      c.lineTo(
        bodyB.position.x - collision.penetration.x * k,
        bodyB.position.y - collision.penetration.y * k,
      );

      k = 1;

      if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
      if (bodyA.isStatic) k = 0;

      c.moveTo(bodyA.position.x, bodyA.position.y);
      c.lineTo(
        bodyA.position.x + collision.penetration.x * k,
        bodyA.position.y + collision.penetration.y * k,
      );
    }

    if (options.wireframes) {
      c.strokeStyle = "rgba(255,165,0,0.5)";
    } else {
      c.strokeStyle = "orange";
    }
    c.stroke();
  }
  static inspector(inspector: any, context: any) {
    const _engine = inspector.engine,
      selected = inspector.selected,
      render = inspector.render,
      options = render.options;
    let bounds;

    if (options.hasBounds) {
      const boundsWidth = render.bounds.max.x - render.bounds.min.x,
        boundsHeight = render.bounds.max.y - render.bounds.min.y,
        boundsScaleX = boundsWidth / render.options.width,
        boundsScaleY = boundsHeight / render.options.height;

      context.scale(1 / boundsScaleX, 1 / boundsScaleY);
      context.translate(-render.bounds.min.x, -render.bounds.min.y);
    }

    for (let i = 0; i < selected.length; i++) {
      const item = selected[i].data;

      context.translate(0.5, 0.5);
      context.lineWidth = 1;
      context.strokeStyle = "rgba(255,165,0,0.9)";
      context.setLineDash([1, 2]);

      switch (item.type) {
        case "body":
          // render body selections
          bounds = item.bounds;
          context.beginPath();
          context.rect(
            Math.floor(bounds.min.x - 3),
            Math.floor(bounds.min.y - 3),
            Math.floor(bounds.max.x - bounds.min.x + 6),
            Math.floor(bounds.max.y - bounds.min.y + 6),
          );
          context.closePath();
          context.stroke();

          break;

        case "constraint":
          let point = item.pointA;
          if (item.bodyA) {
            point = item.pointB;
          }
          context.beginPath();
          context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          context.closePath();
          context.stroke();

          break;
      }

      context.setLineDash([]);
      context.translate(-0.5, -0.5);
    }
    if (inspector.selectStart !== null) {
      context.translate(0.5, 0.5);
      context.lineWidth = 1;
      context.strokeStyle = "rgba(255,165,0,0.6)";
      context.fillStyle = "rgba(255,165,0,0.1)";
      bounds = inspector.selectBounds;
      context.beginPath();
      context.rect(
        Math.floor(bounds.min.x),
        Math.floor(bounds.min.y),
        Math.floor(bounds.max.x - bounds.min.x),
        Math.floor(bounds.max.y - bounds.min.y),
      );
      context.closePath();
      context.stroke();
      context.fill();
      context.translate(-0.5, -0.5);
    }

    if (options.hasBounds) {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
  static #updateTiming(render: any, time: number) {
    const engine = render.engine,
      timing = render.timing,
      historySize = timing.historySize,
      timestamp = engine.timing.timestamp;

    timing.delta = time - timing.lastTime || NekoRenderer.#goodDelta;
    timing.lastTime = time;

    timing.timestampElapsed = timestamp - timing.lastTimestamp || 0;
    timing.lastTimestamp = timestamp;

    timing.deltaHistory.unshift(timing.delta);
    timing.deltaHistory.length = Math.min(
      timing.deltaHistory.length,
      historySize,
    );

    timing.engineDeltaHistory.unshift(engine.timing.lastDelta);
    timing.engineDeltaHistory.length = Math.min(
      timing.engineDeltaHistory.length,
      historySize,
    );

    timing.timestampElapsedHistory.unshift(timing.timestampElapsed);
    timing.timestampElapsedHistory.length = Math.min(
      timing.timestampElapsedHistory.length,
      historySize,
    );

    timing.engineElapsedHistory.unshift(engine.timing.lastElapsed);
    timing.engineElapsedHistory.length = Math.min(
      timing.engineElapsedHistory.length,
      historySize,
    );

    timing.elapsedHistory.unshift(timing.lastElapsed);
    timing.elapsedHistory.length = Math.min(
      timing.elapsedHistory.length,
      historySize,
    );
  }
  static async #getTexture(render: any, imagePath: string) {
    const image = render.textures[imagePath];

    if (image) {
      return image;
    }
    render.textures[imagePath] = await loadImage(
      "https://deno.land/images/artwork/hashrock_simple.png",
    );
    return render.textures[imagePath];
  }
  static #applyBackground(_render: any, _background: any) {
  }
  static #getPixelRatio(canvas: Canvas) {
    const _context = canvas.getContext("2d"),
      devicePixelRatio = 1,
      backingStorePixelRatio = 1;

    return devicePixelRatio / backingStorePixelRatio;
  }
  static #createCanvas(width: number, height: number) {
    return new Canvas({
      title: "Neko",
      width,
      height,
      fps: 60,
    });
  }
}

import {
  Bodies,
  Composite,
  Composites,
  Constraint,
  Engine,
  Runner,
  Vector,
} from "../mod.ts";
import { NekoRenderer } from "../renderers/NekoRenderer.ts";

const engine = Engine.create();
const renderer = NekoRenderer.create({
  engine: engine,
  options: {
    width: 800,
    height: 600,
    showAngleIndicator: true,
  },
});
NekoRenderer.run(renderer);
const rows = 10;
const _y = 600 - 25 - 40 * rows;
const stack = Composites.stack(
  300,
  _y,
  5,
  rows,
  0,
  0,
  (x: number, y: number) => Bodies.rectangle(x, y, 40, 40),
);
Composite.add(engine.world, [
  stack,
  // walls
  Bodies.rectangle(400, 0, 800, 50, { isStatic: true }),
  Bodies.rectangle(400, 600, 800, 50, { isStatic: true }),
  Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
  Bodies.rectangle(0, 300, 50, 600, { isStatic: true }),
]);

const ball = Bodies.circle(100, 400, 50, { density: 0.04, frictionAir: 0.005 });

Composite.add(engine.world, ball);

Composite.add(
  engine.world,
  Constraint.create({
    pointA: Vector.create(300, 100),
    bodyB: ball,
  }),
);

NekoRenderer.lookAt(renderer, {
  min: { x: 0, y: 0 },
  max: { x: 800, y: 600 },
});

const runner = Runner.create();

Runner.run(runner, engine);

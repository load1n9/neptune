import { Bodies, Composite, Engine, Runner } from "../mod.ts";
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
Composite.add(engine.world, [
  // walls
  Bodies.rectangle(400, 0, 800, 50, { isStatic: true }),
  Bodies.rectangle(400, 600, 800, 50, { isStatic: true }),
  Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
  Bodies.rectangle(0, 300, 50, 600, { isStatic: true }),
  //boxes
  Bodies.rectangle(400, 200, 80, 80),
  Bodies.rectangle(450, 50, 80, 80),
]);
NekoRenderer.lookAt(renderer, {
  min: { x: 0, y: 0 },
  max: { x: 800, y: 600 },
});

NekoRenderer.run(renderer);
const runner = Runner.create();

Runner.run(runner, engine);

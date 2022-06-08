export interface IVector {
  x: number;
  y: number;
  angle?: number;
}

export interface IVertex extends IVector {
  x: number;
  y: number;
  index: number;
  body: IBody | null;
  isInternal?: boolean;
}
export type IAxes = IVector[];
export interface IBody {
  id: number;
  type: string;
  label: string;
  // deno-lint-ignore no-explicit-any
  parts: any[];
  // deno-lint-ignore no-explicit-any
  plugin: any;
  angle: number;
  vertices: IVertex[];
  position: IVector;
  force: IVector;
  torque: number;
  positionImpulse: IVector;
  constraintImpulse: IVector;
  totalContacts: number;
  speed: number;
  angularSpeed: number;
  velocity: IVector;
  angularVelocity: number;
  isSensor: boolean;
  isStatic: boolean;
  isSleeping: boolean;
  motion: number;
  sleepThreshold: number;
  sleepCounter?: number;
  density: number;
  restitution: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  collisionFilter: {
    category: number;
    mask: number;
    group: number;
  };
  slop: number;
  timeScale: number;
  render: {
    visible: boolean;
    opacity: number;
    // deno-lint-ignore no-explicit-any
    strokeStyle: any;
    // deno-lint-ignore no-explicit-any
    fillStyle: any;
    // deno-lint-ignore no-explicit-any
    lineWidth: any;
    sprite: {
      xScale: number;
      yScale: number;
      xOffset: number;
      yOffset: number;
    };
  };
  // deno-lint-ignore no-explicit-any
  events: any;
  // deno-lint-ignore no-explicit-any
  bounds: any;
  // deno-lint-ignore no-explicit-any
  chamfer: any;
  circleRadius: number | null;
  positionPrev: IVector | null;
  anglePrev: number;
  // deno-lint-ignore no-explicit-any
  parent: any;
  axes: IAxes;
  area: number;
  mass: number;
  inertia: number;
  // deno-lint-ignore no-explicit-any
  _original: any;
  inverseMass?: number;
  inverseInertia?: number;
}
export interface IBounds { 
  min: IVector, 
  max: IVector
}
import { Sleeping } from "../core/Sleeping.ts";
import { Common } from "../core/Common.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { Vertices } from "../geometry/Vertices.ts";
import type { IBody, IVector, IVertex } from "../types.ts";
import { Axes } from "../geometry/Axes.ts";

export class Body {
  static _inertiaScale = 4;
  static _nextCollidingGroupId = 1;
  static _nextNonCollidingGroupId = -1;
  static _nextCategory = 0x0001;
  static create(options?: Partial<IBody>): IBody {
    const defaults = {
      id: Common.nextId(),
      type: "body",
      label: "Body",
      parts: [],
      plugin: {},
      angle: 0,
      vertices: Vertices.fromPath("L 0 0 L 40 0 L 40 40 L 0 40"),
      position: { x: 0, y: 0 },
      force: { x: 0, y: 0 },
      torque: 0,
      positionImpulse: { x: 0, y: 0 },
      constraintImpulse: { x: 0, y: 0, angle: 0 },
      totalContacts: 0,
      speed: 0,
      angularSpeed: 0,
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      isSensor: false,
      isStatic: false,
      isSleeping: false,
      motion: 0,
      sleepThreshold: 60,
      density: 0.001,
      restitution: 0,
      friction: 0.1,
      frictionStatic: 0.5,
      frictionAir: 0.01,
      collisionFilter: {
        category: 0x0001,
        mask: 0xFFFFFFFF,
        group: 0,
      },
      slop: 0.05,
      timeScale: 1,
      render: {
        visible: true,
        opacity: 1,
        strokeStyle: null,
        fillStyle: null,
        lineWidth: null,
        sprite: {
          xScale: 1,
          yScale: 1,
          xOffset: 0,
          yOffset: 0,
        },
      },
      events: null,
      bounds: null,
      chamfer: null,
      circleRadius: 0,
      positionPrev: null,
      anglePrev: 0,
      parent: null,
      axes: null,
      area: 0,
      mass: 0,
      inertia: 0,
      _original: null,
    };

    const body = Common.extend(defaults, options);

    _initProperties(body, options);

    return body;
  }
  static nextGroup(isNonColliding = false) {
    return isNonColliding
      ? Body._nextNonCollidingGroupId--
      : Body._nextCollidingGroupId++;
  }
  static nextCategory() {
    Body._nextCategory = Body._nextCategory << 1;
    return Body._nextCategory;
  }
  // deno-lint-ignore no-explicit-any
  static set(body: IBody, settings: any, value?: any) {
    let property;

    if (typeof settings === "string") {
      property = settings;
      settings = {};
      settings[property] = value;
    }
    for (property in settings) {
      if (!Object.prototype.hasOwnProperty.call(settings, property)) {
        continue;
      }
      value = settings[property];
      switch (property) {
        case "isStatic":
          Body.setStatic(body, value);
          break;
        case "isSleeping":
          Sleeping.set(body, value);
          break;
        case "mass":
          Body.setMass(body, value);
          break;
        case "density":
          Body.setDensity(body, value);
          break;
        case "inertia":
          Body.setInertia(body, value);
          break;
        case "vertices":
          Body.setVertices(body, value);
          break;
        case "position":
          Body.setPosition(body, value);
          break;
        case "angle":
          Body.setAngle(body, value);
          break;
        case "velocity":
          Body.setVelocity(body, value);
          break;
        case "angularVelocity":
          Body.setAngularVelocity(body, value);
          break;
        case "parts":
          Body.setParts(body, value);
          break;
        case "centre":
          Body.setCentre(body, value);
          break;
        default:
          // deno-lint-ignore no-explicit-any
          (body as any)[property] = value;
      }
    }
  }
  static setStatic(body: IBody, isStatic = false) {
    for (let i = 0; i < body.parts.length; i++) {
      const part = body.parts[i];
      part.isStatic = isStatic;

      if (isStatic) {
        part._original = {
          restitution: part.restitution,
          friction: part.friction,
          mass: part.mass,
          inertia: part.inertia,
          density: part.density,
          inverseMass: part.inverseMass,
          inverseInertia: part.inverseInertia,
        };

        part.restitution = 0;
        part.friction = 1;
        part.mass = part.inertia = part.density = Infinity;
        part.inverseMass = part.inverseInertia = 0;

        part.positionPrev.x = part.position.x;
        part.positionPrev.y = part.position.y;
        part.anglePrev = part.angle;
        part.angularVelocity = 0;
        part.speed = 0;
        part.angularSpeed = 0;
        part.motion = 0;
      } else if (part._original) {
        part.restitution = part._original.restitution;
        part.friction = part._original.friction;
        part.mass = part._original.mass;
        part.inertia = part._original.inertia;
        part.density = part._original.density;
        part.inverseMass = part._original.inverseMass;
        part.inverseInertia = part._original.inverseInertia;

        part._original = null;
      }
    }
  }

  static setMass(body: IBody, mass: number) {
    const moment = body.inertia / (body.mass / 6);
    body.inertia = moment * (mass / 6);
    body.inverseInertia = 1 / body.inertia;

    body.mass = mass;
    body.inverseMass = 1 / body.mass;
    body.density = body.mass / body.area;
  }

  static setDensity(body: IBody, density: number) {
    Body.setMass(body, density * body.area);
    body.density = density;
  }

  static setInertia(body: IBody, inertia: number) {
    body.inertia = inertia;
    body.inverseInertia = 1 / body.inertia;
  }

  static setVertices(body: IBody, vertices: IVertex[]) {
    body.vertices = vertices[0].body === body
      ? vertices
      : Vertices.create(vertices, body);

    body.axes = Axes.fromVertices(body.vertices);
    body.area = Vertices.area(body.vertices);
    Body.setMass(body, body.density * body.area);

    const centre = Vertices.centre(body.vertices);
    Vertices.translate(body.vertices, centre, -1);
    Body.setInertia(
      body,
      Body._inertiaScale * Vertices.inertia(body.vertices, body.mass),
    );
    Vertices.translate(body.vertices, body.position);
    Bounds.update(body.bounds, body.vertices, body.velocity);
  }

  static setParts(body: IBody, parts: IBody[], autoHull = true) {
    let i;
    parts = parts.slice(0);
    body.parts.length = 0;
    body.parts.push(body);
    body.parent = body;

    for (i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part !== body) {
        part.parent = body;
        body.parts.push(part);
      }
    }

    if (body.parts.length === 1) {
      return;
    }

    if (autoHull) {
      let vertices: IVertex[] = [];
      for (i = 0; i < parts.length; i++) {
        vertices = vertices.concat(parts[i].vertices);
      }

      Vertices.clockwiseSort(vertices);

      const hull = Vertices.hull(vertices);
      const hullCentre = Vertices.centre(hull);

      Body.setVertices(body, hull);
      Vertices.translate(body.vertices, hullCentre);
    }

    const total = Body._totalProperties(body);

    body.area = total.area;
    body.parent = body;
    body.position.x = total.centre.x;
    body.position.y = total.centre.y;
    body.positionPrev!.x = total.centre.x;
    body.positionPrev!.y = total.centre.y;

    Body.setMass(body, total.mass);
    Body.setInertia(body, total.inertia);
    Body.setPosition(body, total.centre);
  }

  static setCentre(body: IBody, centre: IVector, relative = false) {
    if (!relative) {
      body.positionPrev!.x = centre.x -
        (body.position.x - body.positionPrev!.x);
      body.positionPrev!.y = centre.y -
        (body.position.y - body.positionPrev!.y);
      body.position.x = centre.x;
      body.position.y = centre.y;
    } else {
      body.positionPrev!.x += centre.x;
      body.positionPrev!.y += centre.y;
      body.position.x += centre.x;
      body.position.y += centre.y;
    }
  }

  static setPosition(body: IBody, position: IVector) {
    const delta = Vector.subtract(position, body.position);
    body.positionPrev!.x += delta.x;
    body.positionPrev!.y += delta.y;

    for (let i = 0; i < body.parts.length; i++) {
      const part = body.parts[i];
      part.position.x += delta.x;
      part.position.y += delta.y;
      Vertices.translate(part.vertices, delta);
      Bounds.update(part.bounds, part.vertices, body.velocity);
    }
  }

  static setAngle(body: IBody, angle: number) {
    const delta = angle - body.angle;
    body.anglePrev += delta;

    for (let i = 0; i < body.parts.length; i++) {
      const part = body.parts[i];
      part.angle += delta;
      Vertices.rotate(part.vertices, delta, body.position);
      Axes.rotate(part.axes, delta);
      Bounds.update(part.bounds, part.vertices, body.velocity);
      if (i > 0) {
        Vector.rotateAbout(part.position, delta, body.position, part.position);
      }
    }
  }

  static setVelocity(body: IBody, velocity: IVector) {
    body.positionPrev!.x = body.position.x - velocity.x;
    body.positionPrev!.y = body.position.y - velocity.y;
    body.velocity.x = velocity.x;
    body.velocity.y = velocity.y;
    body.speed = Vector.magnitude(body.velocity);
  }

  static setAngularVelocity(body: IBody, velocity: number) {
    body.anglePrev = body.angle - velocity;
    body.angularVelocity = velocity;
    body.angularSpeed = Math.abs(body.angularVelocity);
  }

  static translate(body: IBody, translation: IVector) {
    Body.setPosition(body, Vector.add(body.position, translation));
  }

  static rotate(body: IBody, rotation: number, point?: IVector) {
    if (!point) {
      Body.setAngle(body, body.angle + rotation);
    } else {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const dx = body.position.x - point.x;
      const dy = body.position.y - point.y;

      Body.setPosition(body, {
        x: point.x + (dx * cos - dy * sin),
        y: point.y + (dx * sin + dy * cos),
      });

      Body.setAngle(body, body.angle + rotation);
    }
  }
  static scale(body: IBody, scaleX: number, scaleY: number, point?: IVector) {
    let totalArea = 0;
    let totalInertia = 0;

    point = point || body.position;

    for (let i = 0; i < body.parts.length; i++) {
      const part = body.parts[i];

      Vertices.scale(part.vertices, scaleX, scaleY, point);

      part.axes = Axes.fromVertices(part.vertices);
      part.area = Vertices.area(part.vertices);
      Body.setMass(part, body.density * part.area);

      Vertices.translate(part.vertices, {
        x: -part.position.x,
        y: -part.position.y,
      });
      Body.setInertia(
        part,
        Body._inertiaScale * Vertices.inertia(part.vertices, part.mass),
      );
      Vertices.translate(part.vertices, {
        x: part.position.x,
        y: part.position.y,
      });

      if (i > 0) {
        totalArea += part.area;
        totalInertia += part.inertia;
      }

      part.position.x = point.x + (part.position.x - point.x) * scaleX;
      part.position.y = point.y + (part.position.y - point.y) * scaleY;

      Bounds.update(part.bounds, part.vertices, body.velocity);
    }

    if (body.parts.length > 1) {
      body.area = totalArea;

      if (!body.isStatic) {
        Body.setMass(body, body.density * totalArea);
        Body.setInertia(body, totalInertia);
      }
    }

    if (body.circleRadius) {
      if (scaleX === scaleY) {
        body.circleRadius *= scaleX;
      } else {
        body.circleRadius = null;
      }
    }
  }
  static update(
    body: IBody,
    deltaTime: number,
    timeScale: number,
    correction: number,
  ) {
    const deltaTimeSquared = Math.pow(
      deltaTime * timeScale * body.timeScale,
      2,
    );

    const frictionAir = 1 - body.frictionAir * timeScale * body.timeScale;
    const velocityPrevX = body.position.x - body.positionPrev!.x;
    const velocityPrevY = body.position.y - body.positionPrev!.y;

    body.velocity.x = (velocityPrevX * frictionAir * correction) +
      (body.force.x / body.mass) * deltaTimeSquared;
    body.velocity.y = (velocityPrevY * frictionAir * correction) +
      (body.force.y / body.mass) * deltaTimeSquared;

    body.positionPrev!.x = body.position.x;
    body.positionPrev!.y = body.position.y;
    body.position.x += body.velocity.x;
    body.position.y += body.velocity.y;

    body.angularVelocity =
      ((body.angle - body.anglePrev) * frictionAir * correction) +
      (body.torque / body.inertia) * deltaTimeSquared;
    body.anglePrev = body.angle;
    body.angle += body.angularVelocity;

    body.speed = Vector.magnitude(body.velocity);
    body.angularSpeed = Math.abs(body.angularVelocity);

    for (let i = 0; i < body.parts.length; i++) {
      const part = body.parts[i];

      Vertices.translate(part.vertices, body.velocity);

      if (i > 0) {
        part.position.x += body.velocity.x;
        part.position.y += body.velocity.y;
      }

      if (body.angularVelocity !== 0) {
        Vertices.rotate(part.vertices, body.angularVelocity, body.position);
        Axes.rotate(part.axes, body.angularVelocity);
        if (i > 0) {
          Vector.rotateAbout(
            part.position,
            body.angularVelocity,
            body.position,
            part.position,
          );
        }
      }

      Bounds.update(part.bounds, part.vertices, body.velocity);
    }
  }

  static applyForce(body: IBody, position: IVector, force: IVector) {
    body.force.x += force.x;
    body.force.y += force.y;
    const offset = {
      x: position.x - body.position.x,
      y: position.y - body.position.y,
    };
    body.torque += offset.x * force.y - offset.y * force.x;
  }

  static _totalProperties(body: IBody) {
    // https://ecourses.ou.edu/cgi-bin/ebook.cgi?doc=&topic=st&chap_sec=07.2&page=theory
    // http://output.to/sideway/default.asp?qno=121100087
    const properties = {
      mass: 0,
      area: 0,
      inertia: 0,
      centre: Vector.create(),
    };
    for (let i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; i++) {
      const part = body.parts[i];
      const mass = part.mass !== Infinity ? part.mass : 1;

      properties.mass += mass;
      properties.area += part.area;
      properties.inertia += part.inertia;
      properties.centre = Vector.add(
        properties.centre,
        Vector.multiply(part.position, mass),
      );
    }

    properties.centre = Vector.divide(properties.centre, properties.mass);

    return properties;
  }
}

const _initProperties = (body: IBody, options: Partial<IBody> = {}) => {
  Body.set(body, {
    bounds: body.bounds || Bounds.create(body.vertices),
    positionPrev: body.positionPrev || Vector.clone(body.position),
    anglePrev: body.anglePrev || body.angle,
    vertices: body.vertices,
    parts: body.parts || [body],
    isStatic: body.isStatic,
    isSleeping: body.isSleeping,
    parent: body.parent || body,
  });

  Vertices.rotate(body.vertices, body.angle, body.position);
  Axes.rotate(body.axes, body.angle);
  Bounds.update(body.bounds, body.vertices, body.velocity);

  // allow options to override the automatically calculated properties
  Body.set(body, {
    axes: options.axes || body.axes,
    area: options.area || body.area,
    mass: options.mass || body.mass,
    inertia: options.inertia || body.inertia,
  });

  // render properties
  const defaultFillStyle = (body.isStatic ? "#14151f" : Common.choose([
      "#f19648",
      "#f5d259",
      "#f55a3c",
      "#063e7b",
      "#ececd1",
    ])),
    defaultStrokeStyle = body.isStatic ? "#555" : "#ccc",
    defaultLineWidth = body.isStatic && body.render.fillStyle === null ? 1 : 0;
  body.render.fillStyle = body.render.fillStyle || defaultFillStyle;
  body.render.strokeStyle = body.render.strokeStyle || defaultStrokeStyle;
  body.render.lineWidth = body.render.lineWidth || defaultLineWidth;
  body.render.sprite.xOffset += -(body.bounds.min.x - body.position.x) /
    (body.bounds.max.x - body.bounds.min.x);
  body.render.sprite.yOffset += -(body.bounds.min.y - body.position.y) /
    (body.bounds.max.y - body.bounds.min.y);
};

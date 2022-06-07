// deno-lint-ignore-file no-explicit-any
import { Common } from "../core/Common.ts";
import { Sleeping } from "../core/Sleeping.ts";
import { Axes } from "../geometry/Axes.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { Vertices } from "../geometry/Vertices.ts";

export class Body {
  #inertiaScale = 4;
  #nextCollidingGroupId = 1;
  #nextNonCollidingGroupId = -1;
  #nextCategory = 0x0001;
  body: any;
  constructor(options: any) {
    const defaults = {
      id: Common.nextId(),
      type: "this.body",
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
    this.body = Common.extend(defaults, options);
    this.#initProperties(options);
  }
  #initProperties(options: any) {
    options = options || {};

    // init required properties (order is important)
    this.set({
      bounds: this.body.bounds || new Bounds(this.body.vertices),
      positionPrev: this.body.positionPrev || Vector.clone(this.body.position),
      anglePrev: this.body.anglePrev || this.body.angle,
      vertices: this.body.vertices,
      parts: this.body.parts || [this.body],
      isStatic: this.body.isStatic,
      isSleeping: this.body.isSleeping,
      parent: this.body.parent || this.body,
    });

    this.body.vertices.rotate(this.body.angle, this.body.position);
    this.body.axes.rotate(this.body.angle);
    this.body.bounds.update(this.body.vertices, this.body.velocity);

    // allow options to override the automatically calculated properties
    this.set({
      axes: options.axes || this.body.axes,
      area: options.area || this.body.area,
      mass: options.mass || this.body.mass,
      inertia: options.inertia || this.body.inertia,
    });

    // render properties
    const defaultFillStyle = (this.body.isStatic ? "#14151f" : Common.choose([
        "#f19648",
        "#f5d259",
        "#f55a3c",
        "#063e7b",
        "#ececd1",
      ])),
      defaultStrokeStyle = this.body.isStatic ? "#555" : "#ccc",
      defaultLineWidth =
        this.body.isStatic && this.body.render.fillStyle === null ? 1 : 0;
    this.body.render.fillStyle = this.body.render.fillStyle || defaultFillStyle;
    this.body.render.strokeStyle = this.body.render.strokeStyle ||
      defaultStrokeStyle;
    this.body.render.lineWidth = this.body.render.lineWidth || defaultLineWidth;
    this.body.render.sprite.xOffset +=
      -(this.body.bounds.min.x - this.body.position.x) /
      (this.body.bounds.max.x - this.body.bounds.min.x);
    this.body.render.sprite.yOffset +=
      -(this.body.bounds.min.y - this.body.position.y) /
      (this.body.bounds.max.y - this.body.bounds.min.y);
  }
  set(body: any, value?: any) {
    let property;

    if (typeof body === "string") {
      property = body;
      body = {};
      body[property] = value;
    }
    for (property in body) {
      if (!Object.prototype.hasOwnProperty.call(body, property)) {
        continue;
      }

      value = body[property];
      switch (property) {
        case "isStatic":
          this.setStatic(value);
          break;
        case "isSleeping":
          Sleeping.set(this, value);
          break;
        case "mass":
          this.setMass(value);
          break;
        case "density":
          this.setDensity(value);
          break;
        case "inertia":
          this.setInertia(value);
          break;
        case "vertices":
          this.setVertices(value);
          break;
        case "position":
          this.setPosition(value);
          break;
        case "angle":
          this.setAngle(value);
          break;
        case "velocity":
          this.setVelocity(value);
          break;
        case "angularVelocity":
          this.setAngularVelocity(value);
          break;
        case "parts":
          this.setParts(value);
          break;
        case "centre":
          this.setCentre(value);
          break;
        default:
          this.body[property] = value;
      }
    }
  }
  setStatic(isStatic: boolean) {
    for (let i = 0; i < this.body.parts.length; i++) {
      const part = this.body.parts[i];
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
  setMass(mass: number) {
    const moment = this.body.inertia / (this.body.mass / 6);
    this.body.inertia = moment * (mass / 6);
    this.body.inverseInertia = 1 / this.body.inertia;
    this.body.mass = mass;
    this.body.inverseMass = 1 / this.body.mass;
    this.body.density = this.body.mass / this.body.area;
  }
  setDensity(density: number) {
    this.setMass(density * this.body.area);
    this.body.density = density;
  }
  setInertia(inertia: number) {
    this.body.inertia = inertia;
    this.body.inverseInertia = 1 / this.body.inertia;
  }
  setVertices(vertices: Vertices) {
    // change vertices
    if (vertices.vertices[0].body === this) {
      this.body.vertices = vertices;
    } else {
      this.body.vertices = new Vertices(vertices.vertices, this);
    }

    // update properties
    this.body.axes = Axes.fromVertices(this.body.vertices);
    this.body.area = this.body.vertices.area();
    this.setMass(this.body.density * this.body.area);

    // orient vertices around the centre of mass at origin (0, 0)
    const centroid = this.body.vertices.centroid();
    this.body.vertices.translate(centroid, -1);

    // update inertia while vertices are at origin (0, 0)
    this.setInertia(
      this.#inertiaScale * this.body.vertices.inertia(this.body.mass),
    );

    this.body.vertices.translate(this.body.position);
    this.body.bounds.update(this.body.vertices, this.body.velocity);
  }
  setParts(parts: any, autoHull?: boolean) {
    let i;

    // add all the parts, ensuring that the first part is always the parent body
    parts = parts.slice(0);
    this.body.parts.length = 0;
    this.body.parts.push(this.body);
    this.body.parent = this.body;

    for (i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part !== this.body) {
        part.parent = this.body;
        this.body.parts.push(part);
      }
    }

    if (this.body.parts.length === 1) {
      return;
    }

    autoHull = typeof autoHull !== "undefined" ? autoHull : true;

    // find the convex hull of all parts to set on the parent body
    if (autoHull) {
      let _vertices: any[] = [];
      for (i = 0; i < parts.length; i++) {
        _vertices = _vertices.concat(parts[i].vertices.vertices);
      }
      const vertices = new Vertices(_vertices, this.body);

      vertices.clockwiseSort();

      const hull = vertices.hull();
      const hullCentre = hull.centroid();

      this.setVertices(hull);
      this.body.vertices.translate(hullCentre);
    }
    const total = this.#totalProperties();

    this.body.area = total.area;
    this.body.parent = this.body;
    this.body.position.x = total.centre.x;
    this.body.position.y = total.centre.y;
    this.body.positionPrev.x = total.centre.x;
    this.body.positionPrev.y = total.centre.y;

    this.setMass(total.mass);
    this.setInertia(total.inertia);
    this.setPosition(new Vector(total.centre.x, total.centre.y));
  }
  setCentre(centre: Vector, relative?: boolean) {
    if (!relative) {
      this.body.positionPrev.x = centre.x -
        (this.body.position.x - this.body.positionPrev.x);
      this.body.positionPrev.y = centre.y -
        (this.body.position.y - this.body.positionPrev.y);
      this.body.position.x = centre.x;
      this.body.position.y = centre.y;
    } else {
      this.body.positionPrev.x += centre.x;
      this.body.positionPrev.y += centre.y;
      this.body.position.x += centre.x;
      this.body.position.y += centre.y;
    }
  }
  setPosition(position: Vector) {
    const delta = Vector.subtract(position, this.body.position);
    this.body.positionPrev.x += delta.x;
    this.body.positionPrev.y += delta.y;

    for (let i = 0; i < this.body.parts.length; i++) {
      const part = this.body.parts[i];
      part.position.x += delta.x;
      part.position.y += delta.y;
      part.vertices.translate(delta);
      part.bounds.update(part.vertices, this.body.velocity);
    }
  }
  setAngle(angle: number) {
    const delta = angle - this.body.angle;
    this.body.anglePrev += delta;

    for (let i = 0; i < this.body.parts.length; i++) {
      const part = this.body.parts[i];
      part.angle += delta;
      part.vertices.rotate(delta, this.body.position);
      part.axes.rotate(delta);
      part.bounds.update(part.vertices, this.body.velocity);
      if (i > 0) {
        Vector.rotateAbout(
          part.position,
          delta,
          this.body.position,
          part.position,
        );
      }
    }
  }
  setVelocity(velocity: Vector) {
    this.body.positionPrev.x = this.body.position.x - velocity.x;
    this.body.positionPrev.y = this.body.position.y - velocity.y;
    this.body.velocity.x = velocity.x;
    this.body.velocity.y = velocity.y;
    this.body.speed = Vector.magnitude(this.body.velocity);
  }
  setAngularVelocity(velocity: number) {
    this.body.anglePrev = this.body.angle - velocity;
    this.body.angularVelocity = velocity;
    this.body.angularSpeed = Math.abs(this.body.angularVelocity);
  }
  translate(translation: Vector) {
    this.setPosition(Vector.add(this.body.position, translation));
  }
  rotate(rotation: number, point?: Vector) {
    if (!point) {
      this.setAngle(this.body.angle + rotation);
    } else {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const dx = this.body.position.x - point.x;
      const dy = this.body.position.y - point.y;

      this.body.setPosition({
        x: point.x + (dx * cos - dy * sin),
        y: point.y + (dx * sin + dy * cos),
      });

      this.body.setAngle(this.body.angle + rotation);
    }
  }
  scale(scaleX: number, scaleY: number, point: Vector) {
    let totalArea = 0;
    let totalInertia = 0;

    point = point || this.body.position;

    for (let i = 0; i < this.body.parts.length; i++) {
      const part = this.body.parts[i];

      // scale vertices
      part.vertices.scale(scaleX, scaleY, point);

      // update properties
      part.axes = Axes.fromVertices(part.vertices);
      part.area = part.vertices.area();
      part.setMass(this.body.density * part.area);

      // update inertia (requires vertices to be at origin)
      part.vertices.translate({
        x: -part.position.x,
        y: -part.position.y,
      });
      part.setInertia(
        part,
        this.#inertiaScale * part.vertices.inertia(part.mass),
      );
      part.vertices.translate({
        x: part.position.x,
        y: part.position.y,
      });

      if (i > 0) {
        totalArea += part.area;
        totalInertia += part.inertia;
      }

      // scale position
      part.position.x = point.x + (part.position.x - point.x) * scaleX;
      part.position.y = point.y + (part.position.y - point.y) * scaleY;

      // update bounds
      part.bounds.update(part.vertices, this.body.velocity);
    }

    // handle parent body
    if (this.body.parts.length > 1) {
      this.body.area = totalArea;

      if (!this.body.isStatic) {
        this.body.setMass(this.body.density * totalArea);
        this.body.setInertia(totalInertia);
      }
    }

    // handle circles
    if (this.body.circleRadius) {
      if (scaleX === scaleY) {
        this.body.circleRadius *= scaleX;
      } else {
        // body is no longer a circle
        this.body.circleRadius = null;
      }
    }
  }
  update(deltaTime: number, timeScale: number, correction: number) {
    const deltaTimeSquared = Math.pow(
      deltaTime * timeScale * this.body.timeScale,
      2,
    );

    // from the previous step
    const frictionAir = 1 -
      this.body.frictionAir * timeScale * this.body.timeScale;
    const velocityPrevX = this.body.position.x - this.body.positionPrev.x;
    const velocityPrevY = this.body.position.y - this.body.positionPrev.y;

    // update velocity with Verlet integration
    this.body.velocity.x = (velocityPrevX * frictionAir * correction) +
      (this.body.force.x / this.body.mass) * deltaTimeSquared;
    this.body.velocity.y = (velocityPrevY * frictionAir * correction) +
      (this.body.force.y / this.body.mass) * deltaTimeSquared;

    this.body.positionPrev.x = this.body.position.x;
    this.body.positionPrev.y = this.body.position.y;
    this.body.position.x += this.body.velocity.x;
    this.body.position.y += this.body.velocity.y;

    // update angular velocity with Verlet integration
    this.body.angularVelocity =
      ((this.body.angle - this.body.anglePrev) * frictionAir * correction) +
      (this.body.torque / this.body.inertia) * deltaTimeSquared;
    this.body.anglePrev = this.body.angle;
    this.body.angle += this.body.angularVelocity;

    // track speed and acceleration
    this.body.speed = Vector.magnitude(this.body.velocity);
    this.body.angularSpeed = Math.abs(this.body.angularVelocity);

    // transform the body geometry
    for (let i = 0; i < this.body.parts.length; i++) {
      const part = this.body.parts[i];

      part.vertices.translate(this.body.velocity);

      if (i > 0) {
        part.position.x += this.body.velocity.x;
        part.position.y += this.body.velocity.y;
      }

      if (this.body.angularVelocity !== 0) {
        part.vertices.rotate(this.body.angularVelocity, this.body.position);
        part.axes.rotate(this.body.angularVelocity);
        if (i > 0) {
          Vector.rotateAbout(
            part.position,
            this.body.angularVelocity,
            this.body.position,
            part.position,
          );
        }
      }

      part.bounds.update(part.vertices, this.body.velocity);
    }
  }
  applyForce(position: Vector, force: Vector) {
    this.body.force.x += force.x;
    this.body.force.y += force.y;
    const offset = {
      x: position.x - this.body.position.x,
      y: position.y - this.body.position.y,
    };
    this.body.torque += offset.x * force.y - offset.y * force.x;
  }
  #totalProperties() {
    const properties = {
      mass: 0,
      area: 0,
      inertia: 0,
      centre: { x: 0, y: 0 },
    };
    for (
      let i = this.body.parts.length === 1 ? 0 : 1;
      i < this.body.parts.length;
      i++
    ) {
      const part = this.body.parts[i];
      const mass = part.mass !== Infinity ? part.mass : 1;

      properties.mass += mass;
      properties.area += part.area;
      properties.inertia += part.inertia;
      properties.centre = Vector.add(
        new Vector(properties.centre.x, properties.centre.y),
        Vector.multiply(part.position, mass),
      );
    }

    properties.centre = Vector.divide(
      new Vector(properties.centre.x, properties.centre.y),
      properties.mass,
    );

    return properties;
  }
}

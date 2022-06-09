import { Common } from "../core/Common.ts";
import { Events } from "../core/Events.ts";
import { Bounds } from "../geometry/Bounds.ts";
import type { IBody, IComposite, IVector } from "../types.ts";
import { Body } from "./Body.ts";

export class Composite {
  // deno-lint-ignore no-explicit-any
  static create(options: any) {
    return Common.extend({
      id: Common.nextId(),
      type: "composite",
      parent: null,
      isModified: false,
      bodies: [],
      constraints: [],
      composites: [],
      label: "Composite",
      plugin: {},
      cache: {
        allBodies: null,
        allConstraints: null,
        allComposites: null,
      },
    }, options);
  }
  static setModified(
    composite: IComposite,
    isModified = false,
    updateParents = false,
    updateChildren = false,
  ) {
    composite.isModified = isModified;

    if (isModified && composite.cache) {
      composite.cache.allBodies = null;
      composite.cache.allConstraints = null;
      composite.cache.allComposites = null;
    }

    if (updateParents && composite.parent) {
      Composite.setModified(
        composite.parent,
        isModified,
        updateParents,
        updateChildren,
      );
    }

    if (updateChildren) {
      for (let i = 0; i < composite.composites.length; i++) {
        const childComposite = composite.composites[i];
        Composite.setModified(
          childComposite,
          isModified,
          updateParents,
          updateChildren,
        );
      }
    }
  }
  // deno-lint-ignore no-explicit-any
  static add(composite: IComposite, object: any) {
    const objects = [].concat(object);

    Events.trigger(composite, "beforeAdd", { object: object });

    for (let i = 0; i < objects.length; i++) {
      // deno-lint-ignore no-explicit-any
      const obj: any = objects[i];

      switch (obj.type) {
        case "body":
          if (obj.parent !== obj) {
            Common.warn(
              "Composite.add: skipped adding a compound body part (you must add its parent instead)",
            );
            break;
          }
          Composite.addBody(composite, obj);
          break;
        case "constraint":
          Composite.addConstraint(composite, obj);
          break;
        case "composite":
          Composite.addComposite(composite, obj);
          break;
        case "mouseConstraint":
          Composite.addConstraint(composite, obj.constraint);
          break;
      }
    }
    Events.trigger(composite, "afterAdd", { object: object });

    return composite;
  }
  static addComposite(
    compositeA: IComposite,
    compositeB: IComposite,
  ): IComposite {
    compositeA.composites.push(compositeB);
    compositeB.parent = compositeA;
    Composite.setModified(compositeA, true, true, false);
    return compositeA;
  }
  static removeComposite(
    compositeA: IComposite,
    compositeB: IComposite,
    deep = false,
  ) {
    const position = Common.indexOf(compositeA.composites, compositeB);
    if (position !== -1) {
      Composite.removeCompositeAt(compositeA, position);
    }

    if (deep) {
      for (let i = 0; i < compositeA.composites.length; i++) {
        Composite.removeComposite(compositeA.composites[i], compositeB, true);
      }
    }

    return compositeA;
  }
  static removeCompositeAt(composite: IComposite, position: number) {
    composite.composites.splice(position, 1);
    Composite.setModified(composite, true, true, false);
    return composite;
  }
  static addBody(composite: IComposite, body: IBody) {
    composite.bodies.push(body);
    Composite.setModified(composite, true, true, false);
    return composite;
  }
  static removeBody(composite: IComposite, body: IBody, deep = false) {
    const position = Common.indexOf(composite.bodies, body);
    if (position !== -1) {
      Composite.removeBodyAt(composite, position);
    }

    if (deep) {
      for (let i = 0; i < composite.composites.length; i++) {
        Composite.removeBody(composite.composites[i], body, true);
      }
    }

    return composite;
  }
  static removeBodyAt(composite: IComposite, position: number) {
    composite.bodies.splice(position, 1);
    Composite.setModified(composite, true, true, false);
    return composite;
  }
  // deno-lint-ignore no-explicit-any
  static addConstraint(composite: IComposite, constraint: any) {
    composite.constraints.push(constraint);
    Composite.setModified(composite, true, true, false);
    return composite;
  }
  static removeConstraint(
    composite: IComposite,
    // deno-lint-ignore no-explicit-any
    constraint: any,
    deep = false,
  ) {
    const position = Common.indexOf(composite.constraints, constraint);
    if (position !== -1) {
      Composite.removeConstraintAt(composite, position);
    }

    if (deep) {
      for (let i = 0; i < composite.composites.length; i++) {
        Composite.removeConstraint(composite.composites[i], constraint, true);
      }
    }

    return composite;
  }
  static removeConstraintAt(composite: IComposite, position: number) {
    composite.constraints.splice(position, 1);
    Composite.setModified(composite, true, true, false);
    return composite;
  }
  static clear(composite: IComposite, keepStatic = false, deep = false) {
    if (deep) {
      for (let i = 0; i < composite.composites.length; i++) {
        Composite.clear(composite.composites[i], keepStatic, true);
      }
    }

    if (keepStatic) {
      composite.bodies = composite.bodies.filter((body) => body.isStatic);
    } else {
      composite.bodies.length = 0;
    }

    composite.constraints.length = 0;
    composite.composites.length = 0;

    Composite.setModified(composite, true, true, false);

    return composite;
  }
  static allBodies(composite: IComposite) {
    if (composite.cache && composite.cache.allBodies) {
      return composite.cache.allBodies;
    }

    let bodies = ([] as IBody[]).concat(composite.bodies);

    for (let i = 0; i < composite.composites.length; i++) {
      bodies = bodies.concat(Composite.allBodies(composite.composites[i]));
    }

    if (composite.cache) {
      composite.cache.allBodies = bodies;
    }

    return bodies;
  }
  static allConstraints(composite: IComposite) {
    if (composite.cache && composite.cache.allConstraints) {
      return composite.cache.allConstraints;
    }

    // deno-lint-ignore no-explicit-any
    let constraints = ([] as any).concat(composite.constraints);

    for (let i = 0; i < composite.composites.length; i++) {
      constraints = constraints.concat(
        Composite.allConstraints(composite.composites[i]),
      );
    }

    if (composite.cache) {
      composite.cache.allConstraints = constraints;
    }

    return constraints;
  }
  static allComposites(composite: IComposite) {
    if (composite.cache && composite.cache.allComposites) {
      return composite.cache.allComposites;
    }

    // deno-lint-ignore no-explicit-any
    let composites = ([] as any).concat(composite.composites);

    for (let i = 0; i < composite.composites.length; i++) {
      composites = composites.concat(
        Composite.allComposites(composite.composites[i]),
      );
    }

    if (composite.cache) {
      composite.cache.allComposites = composites;
    }

    return composites;
  }
  static get(composite: IComposite, id: number, type: string) {
    let objects;

    switch (type) {
      case "body":
        objects = Composite.allBodies(composite);
        break;
      case "constraint":
        objects = Composite.allConstraints(composite);
        break;
      case "composite":
        objects = Composite.allComposites(composite).concat(composite);
        break;
    }

    if (!objects) {
      return null;
    }

    // deno-lint-ignore no-explicit-any
    const object = objects.filter((obj: any) =>
      obj.id.toString() === id.toString()
    );

    return object.length === 0 ? null : object[0];
  }
  // deno-lint-ignore no-explicit-any
  static move(compositeA: IComposite, objects: any, compositeB: IComposite) {
    Composite.remove(compositeA, objects);
    Composite.add(compositeB, objects);
    return compositeA;
  }
  static rebase(composite: IComposite) {
    const objects = Composite.allBodies(composite)
      .concat(Composite.allConstraints(composite))
      .concat(Composite.allComposites(composite));

    for (let i = 0; i < objects.length; i++) {
      objects[i].id = Common.nextId();
    }

    return composite;
  }
  static translate(
    composite: IComposite,
    translation: IVector,
    recursive = true,
  ) {
    const bodies = recursive
      ? Composite.allBodies(composite)
      : composite.bodies;

    for (let i = 0; i < bodies.length; i++) {
      Body.translate(bodies[i], translation);
    }

    return composite;
  }
  // deno-lint-ignore no-explicit-any
  static remove(composite: IComposite, object: any, deep = false) {
    // deno-lint-ignore no-explicit-any
    const objects: any[] = [].concat(object);

    Events.trigger(composite, "beforeRemove", { object: object });

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];

      switch (obj.type) {
        case "body":
          Composite.removeBody(composite, obj, deep);
          break;
        case "constraint":
          Composite.removeConstraint(composite, obj, deep);
          break;
        case "composite":
          Composite.removeComposite(composite, obj, deep);
          break;
        case "mouseConstraint":
          Composite.removeConstraint(composite, obj.constraint);
          break;
      }
    }

    Events.trigger(composite, "afterRemove", { object: object });

    return composite;
  }
  static rotate(
    composite: IComposite,
    rotation: number,
    point: IVector,
    recursive = true,
  ) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const bodies = recursive
      ? Composite.allBodies(composite)
      : composite.bodies;

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const dx = body.position.x - point.x;
      const dy = body.position.y - point.y;

      Body.setPosition(body, {
        x: point.x + (dx * cos - dy * sin),
        y: point.y + (dx * sin + dy * cos),
      });

      Body.rotate(body, rotation);
    }

    return composite;
  }
  static scale(
    composite: IComposite,
    scaleX: number,
    scaleY: number,
    point: IVector,
    recursive = true,
  ) {
    const bodies = recursive
      ? Composite.allBodies(composite)
      : composite.bodies;

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const dx = body.position.x - point.x;
      const dy = body.position.y - point.y;

      Body.setPosition(body, {
        x: point.x + dx * scaleX,
        y: point.y + dy * scaleY,
      });

      Body.scale(body, scaleX, scaleY);
    }

    return composite;
  }
  static bounds(composite: IComposite) {
    const bodies = Composite.allBodies(composite);
    const vertices = [];

    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      vertices.push(body.bounds.min, body.bounds.max);
    }

    return Bounds.create(vertices);
  }
}

import { Vertices } from "../geometry/Vertices.ts";
import { Common } from "../core/Common.ts";
import { Body } from "../body/Body.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { IBody } from "../types.ts";

export class Bodies {
  static rectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    // deno-lint-ignore no-explicit-any
    options: any = {},
  ) {
    // deno-lint-ignore no-explicit-any
    const rectangle: any = {
      label: "Rectangle Body",
      position: { x: x, y: y },
      vertices: Vertices.fromPath(
        "L 0 0 L " + width + " 0 L " + width + " " + height + " L 0 " + height,
      ),
    };

    if (options.chamfer) {
      const chamfer = options.chamfer;
      rectangle.vertices = Vertices.chamfer(
        rectangle.vertices,
        chamfer.radius,
        chamfer.quality,
        chamfer.qualityMin,
        chamfer.qualityMax,
      );
      delete options.chamfer;
    }

    return Body.create(Common.extend({}, rectangle, options));
  }

  static trapezoid(
    x: number,
    y: number,
    width: number,
    height: number,
    slope: number,
    // deno-lint-ignore no-explicit-any
    options: any = {},
  ) {
    slope *= 0.5;
    const roof = (1 - (slope * 2)) * width;

    const x1 = width * slope;
    const x2 = x1 + roof;
    const x3 = x2 + x1;
    let verticesPath;

    if (slope < 0.5) {
      verticesPath = "L 0 0 L " + x1 + " " + (-height) + " L " + x2 + " " +
        (-height) + " L " + x3 + " 0";
    } else {
      verticesPath = "L 0 0 L " + x2 + " " + (-height) + " L " + x3 + " 0";
    }

    // deno-lint-ignore no-explicit-any
    const trapezoid: any = {
      label: "Trapezoid Body",
      position: { x: x, y: y },
      vertices: Vertices.fromPath(verticesPath),
    };

    if (options.chamfer) {
      const chamfer = options.chamfer;
      trapezoid.vertices = Vertices.chamfer(
        trapezoid.vertices,
        chamfer.radius,
        chamfer.quality,
        chamfer.qualityMin,
        chamfer.qualityMax,
      );
      delete options.chamfer;
    }
    return Body.create(Common.extend({}, trapezoid, options));
  }

  static circle(
    x: number,
    y: number,
    radius: number,
    // deno-lint-ignore no-explicit-any
    options: any = {},
    maxSides = 25,
  ): IBody {

    const circle = {
      label: "Circle Body",
      circleRadius: radius,
    };

    maxSides = maxSides || 25;
    let sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

    if (sides % 2 === 1) {
      sides += 1;
    }

    return Bodies.polygon(
      x,
      y,
      sides,
      radius,
      Common.extend({}, circle, options),
    );
  }
  static polygon(
    x: number,
    y: number,
    sides: number,
    radius: number,
    // deno-lint-ignore no-explicit-any
    options: any = {},
  ): IBody {
    if (sides < 3) {
      return Bodies.circle(x, y, radius, options);
    }

    const theta = 2 * Math.PI / sides;
    let path = "";
    const offset = theta * 0.5;

    for (let i = 0; i < sides; i += 1) {
      const angle = offset + (i * theta);
      const xx = Math.cos(angle) * radius;
      const yy = Math.sin(angle) * radius;

      path += "L " + xx.toFixed(3) + " " + yy.toFixed(3) + " ";
    }

    // deno-lint-ignore no-explicit-any
    const polygon: any = {
      label: "Polygon Body",
      position: { x: x, y: y },
      vertices: Vertices.fromPath(path),
    };

    if (options.chamfer) {
      const chamfer = options.chamfer;
      polygon.vertices = Vertices.chamfer(
        polygon.vertices,
        chamfer.radius,
        chamfer.quality,
        chamfer.qualityMin,
        chamfer.qualityMax,
      );
      delete options.chamfer;
    }

    return Body.create(Common.extend({}, polygon, options));
  }
}

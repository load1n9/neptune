import { Vertices } from "../geometry/Vertices.ts";
import { Common } from "../core/Common.ts";
import { Body } from "../body/Body.ts";
import { Bounds } from "../geometry/Bounds.ts";
import { Vector } from "../geometry/Vector.ts";
import { IBody, IVertex } from "../types.ts";

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
  static fromVertices(
    x: number,
    y: number,
    // deno-lint-ignore no-explicit-any
    vertexSets: any[],
    // deno-lint-ignore no-explicit-any
    options: any = {},
    flagInternal = false,
    // deno-lint-ignore no-explicit-any
    removeCollinear: any = 0.01,
    minimumArea = 10,
    // deno-lint-ignore no-explicit-any
    removeDuplicatePoints: any = 0.01,
  ) {
    const decomp = Common.getDecomp();
    let body;
    let isConvex;
    let isConcave;
    let vertices;
    let i;
    let j;
    let k;
    let v;
    let z;

    const canDecomp = Boolean(decomp && decomp.quickDecomp);

    // deno-lint-ignore no-explicit-any
    const parts: any[] = [];

    if (!Common.isArray(vertexSets[0])) {
      vertexSets = [vertexSets];
    }

    for (v = 0; v < vertexSets.length; v += 1) {
      vertices = vertexSets[v];
      isConvex = Vertices.isConvex(vertices);
      isConcave = !isConvex;

      if (isConcave && !canDecomp) {
        Common.warnOnce(
          "Bodies.fromVertices: Install the 'poly-decomp' library and use Common.setDecomp or provide 'decomp' as a global to decompose concave vertices.",
        );
      }

      if (isConvex || !canDecomp) {
        vertices = isConvex
          ? Vertices.clockwiseSort(vertices)
          : Vertices.hull(vertices);

        parts.push({
          position: { x: x, y: y },
          vertices: vertices,
        });
      } else {
        const concave = vertices.map((vertex: IVertex) => [vertex.x, vertex.y]);

        decomp.makeCCW(concave);
        if (removeCollinear !== false) {
          decomp.removeCollinearPoints(concave, removeCollinear);
        }
        if (removeDuplicatePoints !== false && decomp.removeDuplicatePoints) {
          decomp.removeDuplicatePoints(concave, removeDuplicatePoints);
        }

        const decomposed = decomp.quickDecomp(concave);

        for (i = 0; i < decomposed.length; i++) {
          const chunk = decomposed[i];

          const chunkVertices = chunk.map((vertices: IVertex[]) => {
            return {
              x: vertices[0],
              y: vertices[1],
            };
          });

          if (minimumArea > 0 && Vertices.area(chunkVertices) < minimumArea) {
            continue;
          }
          parts.push({
            position: Vertices.centre(chunkVertices),
            vertices: chunkVertices,
          });
        }
      }
    }

    for (i = 0; i < parts.length; i++) {
      parts[i] = Body.create(Common.extend(parts[i], options));
    }

    if (flagInternal) {
      const coincident_max_dist = 5;

      for (i = 0; i < parts.length; i++) {
        const partA = parts[i];

        for (j = i + 1; j < parts.length; j++) {
          const partB = parts[j];

          if (Bounds.overlaps(partA.bounds, partB.bounds)) {
            const pav = partA.vertices;
            const  pbv = partB.vertices;

            for (k = 0; k < partA.vertices.length; k++) {
              for (z = 0; z < partB.vertices.length; z++) {
                const da = Vector.magnitudeSquared(
                    Vector.subtract(pav[(k + 1) % pav.length], pbv[z]),
                  );
                const db = Vector.magnitudeSquared(
                    Vector.subtract(pav[k], pbv[(z + 1) % pbv.length]),
                  );
                if (da < coincident_max_dist && db < coincident_max_dist) {
                  pav[k].isInternal = true;
                  pbv[z].isInternal = true;
                }
              }
            }
          }
        }
      }
    }
    if (parts.length > 1) {
      body = Body.create(Common.extend({ parts: parts.slice(0) }, options));
      Body.setPosition(body, { x: x, y: y });
      return body;
    } else {
      return parts[0];
    }
  }
}

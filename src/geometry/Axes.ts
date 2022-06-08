import { Common } from "../core/Common.ts";
import { Vector } from "./Vector.ts";
import type { IAxes, IVertex } from "../types.ts";

export class Axes {
  static fromVertices(vertices: IVertex[]): IAxes {
    // deno-lint-ignore no-explicit-any
    const axes: any = {};
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length,
        normal = Vector.normalize({
          x: vertices[j].y - vertices[i].y,
          y: vertices[i].x - vertices[j].x,
        });
      const gradient: number = (normal.y === 0)
        ? Infinity
        : (normal.x / normal.y);
      axes[gradient.toFixed(3).toString()] = normal;
    }
    return Common.values(axes);
  }
  static rotate(axes: IAxes, angle: number): void {
    if (angle === 0) {
      return;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      const xx = axis.x * cos - axis.y * sin;
      axis.y = axis.x * sin + axis.y * cos;
      axis.x = xx;
    }
  }
}

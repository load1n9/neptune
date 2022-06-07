import { Vector } from "./Vector.ts";
import { Common } from "../core/Common.ts";
import { Vertices } from "./Vertices.ts";

export class Axes {
  constructor(public axes: Vector[]) {}
  static fromVertices(vertices: Vertices): Axes {
    const axes: { [prop: string]: Vector } = {};
    for (let i = 0; i < vertices.vertices.length; i++) {
      const j = (i + 1) % vertices.vertices.length,
        normal = Vector.normalize(
          new Vector(
            vertices.vertices[j].y - vertices.vertices[i].y,
            vertices.vertices[i].x - vertices.vertices[j].x,
          ),
        );
      let gradient: number | string = (normal.y === 0)
        ? Infinity
        : (normal.x / normal.y);
      gradient = gradient.toFixed(3).toString();
      axes[gradient] = normal;
    }
    return new Axes(Common.values(axes));
  }
  rotate(angle: number): Axes {
    if (angle === 0) return this;
    for (let i = 0; i < this.axes.length; i++) {
      const axis = this.axes[i];
      const xx = axis.x * Math.cos(angle) - axis.y * Math.sin(angle);
      axis.y = axis.x * Math.sin(angle) + axis.y * Math.cos(angle);
      axis.x = xx;
    }
    return this;
  }
}

// deno-lint-ignore-file no-explicit-any
import { Vector } from "./Vector.ts";

export class Vertex {
  constructor(
    public x: number,
    public y: number,
    public index: number,
    public body: any,
    public isInternal: boolean,
  ) {
  }
}
export class Vertices {
  vertices: Vertex[] = [];
  constructor(points: Vector[], body: any) {
    for (let i = 0; i < points.length; i++) {
      this.vertices.push({
        x: points[i].x,
        y: points[i].y,
        index: i,
        body: body,
        isInternal: false,
      });
    }
  }
  static fromPath(path: string, body: any): Vertices {
    const pathPattern = /L?\s*([-\d.e]+)[\s,]*([-\d.e]+)*/ig;
    const points: Vector[] = [];
    path.replace(pathPattern, (_match: any, x: any, y: any) => {
      points.push(new Vector(parseFloat(x), parseFloat(y)));
      return "";
    });
    return new Vertices(points, body);
  }
  centroid(): Vector {
    const area = this.area(true);
    let centre = new Vector(0, 0);
    let cross: any;
    let temp: any;
    let j: any;

    for (let i = 0; i < this.vertices.length; i++) {
      j = (i + 1) % this.vertices.length;
      cross = Vector.cross(
        new Vector(this.vertices[i].x, this.vertices[i].y),
        new Vector(this.vertices[j].x, this.vertices[j].y),
      );
      temp = Vector.multiply(
        Vector.add(
          new Vector(this.vertices[i].x, this.vertices[i].y),
          new Vector(this.vertices[j].x, this.vertices[j].y),
        ),
        cross,
      );
      centre = Vector.add(centre, temp);
    }

    return Vector.divide(centre, 6 * area);
  }
  area(signed = false): number {
    let area = 0;
    let j = this.vertices.length - 1;
    for (let i = 0; i < this.vertices.length; i++) {
      area += (this.vertices[j].x - this.vertices[i].x) *
        (this.vertices[j].y + this.vertices[i].y);
      j = i;
    }
    return signed ? area / 2 : Math.abs(area) / 2;
  }
  mean(): Vector {
    const average = new Vector(0, 0);

    for (let i = 0; i < this.vertices.length; i++) {
      average.x += this.vertices[i].x;
      average.y += this.vertices[i].y;
    }
    return Vector.divide(average, this.vertices.length);
  }
  inertia(mass: number): number {
    let numerator = 0;
    let denominator = 0;
    const v = this.vertices;
    let cross: number;
    let j: number;
    // http://www.physicsforums.com/showthread.php?t=25293
    for (let n = 0; n < v.length; n++) {
      j = (n + 1) % v.length;
      cross = Math.abs(
        Vector.cross(new Vector(v[j].x, v[j].y), new Vector(v[n].x, v[n].y)),
      );
      numerator += cross *
        (Vector.dot(new Vector(v[j].x, v[j].y), new Vector(v[j].x, v[j].y)) +
          Vector.dot(new Vector(v[j].x, v[j].y), new Vector(v[n].x, v[n].y)) +
          Vector.dot(new Vector(v[n].x, v[n].y), new Vector(v[n].x, v[n].y)));
      denominator += cross;
    }

    return (mass / 6) * (numerator / denominator);
  }
  
}

// deno-lint-ignore-file no-explicit-any
import { Vector } from "./Vector.ts";
import { Common } from "../core/Common.ts";

// ported from https://github.com/liabru/matter-js/blob/master/src/geometry/Vertices.js
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
  constructor(points: Array<Vector | Vertex>, body: any) {
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
  static fromPath(path: string, body?: any): Vertices {
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
  translate(vector: Vector, scalar = 1) {
    const verticesLength = this.vertices.length;
    const translateX = vector.x * scalar;
    const translateY = vector.y * scalar;
    for (let i = 0; i < verticesLength; i++) {
      this.vertices[i].x += translateX;
      this.vertices[i].y += translateY;
    }
    return this;
  }
  rotate(angle: number, point: Vector) {
    if (angle === 0) {
      return;
    }

    const pointX = point.x;
    const pointY = point.y;
    const verticesLength = this.vertices.length;
    let vertex: Vertex;
    let dx: number;
    let dy: number;

    for (let i = 0; i < verticesLength; i++) {
      vertex = this.vertices[i];
      dx = vertex.x - pointX;
      dy = vertex.y - pointY;
      vertex.x = pointX + (dx * Math.cos(angle) - dy * Math.sin(angle));
      vertex.y = pointY + (dx * Math.sin(angle) + dy * Math.cos(angle));
    }
    return this;
  }
  contains(point: Vector): boolean {
    const pointX = point.x;
    const pointY = point.y;
    const verticesLength = this.vertices.length;
    let vertex = this.vertices[verticesLength - 1];
    let nextVertex: Vertex;

    for (let i = 0; i < verticesLength; i++) {
      nextVertex = this.vertices[i];
      if (
        (pointX - vertex.x) * (nextVertex.y - vertex.y) +
            (pointY - vertex.y) * (vertex.x - nextVertex.x) > 0
      ) {
        return false;
      }
      vertex = nextVertex;
    }
    return true;
  }
  scale(scaleX: number, scaleY: number, point?: Vector): Vertices {
    if (scaleX === 1 && scaleY === 1) return this;
    point = point || this.centroid();
    let vertex: Vertex;
    let delta: Vector;
    for (let i = 0; i < this.vertices.length; i++) {
      vertex = this.vertices[i];
      delta = Vector.subtract(new Vector(vertex.x, vertex.y), point);
      this.vertices[i].x = point.x + delta.x * scaleX;
      this.vertices[i].y = point.y + delta.y * scaleY;
    }
    return this;
  }
  chamfer(
    radius: number | number[] = [8],
    quality = 1,
    qualityMin = 2,
    qualityMax = 14,
  ): Array<Vertex | Vector> {
    const newVertices: Array<Vertex | Vector> = [];
    radius = radius instanceof Array ? radius : [radius];
    for (let i = 0; i < this.vertices.length; i++) {
      const prevVertex =
        this.vertices[i - 1 >= 0 ? i - 1 : this.vertices.length - 1];
      const vertex = this.vertices[i];
      const nextVertex = this.vertices[(i + 1) % this.vertices.length];
      const currentRadius = radius[i < radius.length ? i : radius.length - 1];

      if (currentRadius === 0) {
        newVertices.push(vertex);
        continue;
      }

      const prevNormal = Vector.normalize(
        new Vector(vertex.y - prevVertex.y, prevVertex.x - vertex.x),
      );

      const nextNormal = Vector.normalize(
        new Vector(
          nextVertex.y - vertex.y,
          vertex.x - nextVertex.x,
        ),
      );

      const diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2));
      const radiusVector = Vector.multiply(
          Common.clone(prevNormal),
          currentRadius,
        ),
        midNormal = Vector.normalize(
          Vector.multiply(Vector.add(prevNormal, nextNormal), 0.5),
        ),
        scaledVertex = Vector.subtract(
          new Vector(vertex.x, vertex.y),
          Vector.multiply(midNormal, diagonalRadius),
        );

      let precision = quality;

      if (quality === -1) {
        precision = Math.pow(currentRadius, 0.32) * 1.75;
      }

      precision = Common.clamp(precision, qualityMin, qualityMax);
      if (precision % 2 === 1) {
        precision += 1;
      }

      const alpha = Math.acos(Vector.dot(prevNormal, nextNormal)),
        theta = alpha / precision;

      for (let j = 0; j < precision; j++) {
        newVertices.push(
          Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex),
        );
      }
    }
    return newVertices;
  }
  clockwiseSort(): Vertices {
    const centroid = this.mean();
    this.vertices.sort((vertexA: Vertex, vertexB: Vertex) =>
      Vector.angle(centroid, new Vector(vertexA.x, vertexA.y)) -
      Vector.angle(centroid, new Vector(vertexB.x, vertexB.y))
    );
    return this;
  }
  isConvex(): boolean {
    let flag = 0;
    const n = this.vertices.length;
    let i: number;
    let j: number;
    let k: number;
    let z: number;
    if (n < 3) {
      return false;
    }
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      k = (i + 2) % n;
      z = (this.vertices[j].x - this.vertices[i].x) *
        (this.vertices[k].y - this.vertices[j].y);
      z -= (this.vertices[j].y - this.vertices[i].y) *
        (this.vertices[k].x - this.vertices[j].x);
      if (z < 0) {
        flag |= 1;
      } else if (z > 0) {
        flag |= 2;
      }
      if (flag === 3) {
        return false;
      }
    }
    return flag !== 0;
  }
  hull() {
    const upper = [];
    const lower = [];
    let vertex: Vertex;
    let i: number;

    this.vertices = this.vertices.slice(0);
    this.vertices.sort((vertexA, vertexB) => {
      const dx = vertexA.x - vertexB.x;
      return dx !== 0 ? dx : vertexA.y - vertexB.y;
    });
    for (i = 0; i < this.vertices.length; i += 1) {
      vertex = this.vertices[i];
      while (
        lower.length >= 2 &&
        Vector.cross3(
            new Vector(lower[lower.length - 2].x, lower[lower.length - 2].y),
            new Vector(lower[lower.length - 1].x, lower[lower.length - 1].y),
            new Vector(vertex.x, vertex.y),
          ) <= 0
      ) {
        lower.pop();
      }

      lower.push(vertex);
    }
    for (i = this.vertices.length - 1; i >= 0; i -= 1) {
      vertex = this.vertices[i];
      while (
        upper.length >= 2 &&
        Vector.cross3(
            new Vector(upper[upper.length - 2].x, upper[upper.length - 2].y),
            new Vector(upper[upper.length - 1].x, upper[upper.length - 1].y),
            new Vector(vertex.x, vertex.y),
          ) <= 0
      ) {
        upper.pop();
      }
      upper.push(vertex);
    }
    upper.pop();
    lower.pop();
    const hull = upper.concat(lower);
    return new Vertices(hull, null);
  }
}

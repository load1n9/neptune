import type { IBody, IVector, IVertex } from "../types.ts";
import { Vector } from "./Vector.ts";
import { Common } from "../core/Common.ts";

export class Vertices {
  static create(points: IVector[], body: IBody | null = null): IVertex[] {
    return points.map((point: IVector, i: number) => {
      return {
        x: point.x,
        y: point.y,
        index: i,
        body: body,
        isInternal: false,
      };
    });
  }
  static fromPath(path: string, body: IBody | null = null) {
    const pathPattern = /L?\s*([-\d.e]+)[\s,]*([-\d.e]+)*/ig;
    const points: IVector[] = [];
    // deno-lint-ignore no-explicit-any
    path.replace(pathPattern, (_match: any, x: string, y: string) => {
      points.push({ x: parseFloat(x), y: parseFloat(y) });
      return "";
    });
    return Vertices.create(points, body);
  }
  static centroid(vertices: IVertex[]) {
    const area = Vertices.area(vertices, true);
    let centroid = Vector.create();
    let cross: number;
    let temp: IVector;
    let j: number;

    for (let i = 0; i < vertices.length; i++) {
      j = (i + 1) % vertices.length;
      cross = Vector.cross(vertices[i], vertices[j]);
      temp = Vector.multiply(Vector.add(vertices[i], vertices[j]), cross);
      centroid = Vector.add(centroid, temp);
    }

    return Vector.divide(centroid, 6 * area);
  }
  static mean(vertices: IVertex[]): IVector {
    const average = Vector.create();
    vertices.forEach((vertex) => {
      average.x += vertex.x;
      average.y += vertex.y;
    });
    return Vector.divide(average, vertices.length);
  }
  static area(vertices: IVertex[], signed = false): number {
    let area = 0;
    let j = vertices.length - 1;
    vertices.forEach((vertex: IVertex, i: number) => {
      area += (vertices[j].x - vertex.x) * (vertices[j].y + vertex.y);
      j = i;
    });
    return signed ? area / 2 : Math.abs(area) / 2;
  }
  static inertia(vertices: IVertex[], mass: number): number {
    let numerator = 0;
    let denominator = 0;
    const v = vertices;
    let cross;
    let j;
    // http://www.physicsforums.com/showthread.php?t=25293
    for (let n = 0; n < v.length; n++) {
      j = (n + 1) % v.length;
      cross = Math.abs(Vector.cross(v[j], v[n]));
      numerator += cross *
        (Vector.dot(v[j], v[j]) + Vector.dot(v[j], v[n]) +
          Vector.dot(v[n], v[n]));
      denominator += cross;
    }
    return (mass / 6) * (numerator / denominator);
  }
  static translate(
    vertices: IVertex[],
    vector: IVector,
    scalar = 1,
  ): IVertex[] {
    const translateX = vector.x * scalar;
    const translateY = vector.y * scalar;

    return vertices.map((vertex) => {
      vertex.x += translateX;
      vertex.y += translateY;
      return vertex;
    });
  }
  static rotate(
    vertices: IVertex[],
    angle: number,
    point: IVector,
  ): IVertex[] | undefined {
    if (angle === 0) return;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pointX = point.x;
    const pointY = point.y;
    return vertices.map((vertex) => {
      vertex.x = pointX +
        ((vertex.x - pointX) * cos - (vertex.y - pointY) * sin);
      vertex.y = pointY +
        ((vertex.x - pointX) * sin + (vertex.y - pointY) * cos);
      return vertex;
    });
  }
  static contains(vertices: IVertex[], point: IVector): boolean {
    let vertex = vertices[vertices.length - 1];
    let nextVertex;

    for (let i = 0; i < vertices.length; i++) {
      nextVertex = vertices[i];

      if (
        (point.x - vertex.x) * (nextVertex.y - vertex.y) +
            (point.y - vertex.y) * (vertex.x - nextVertex.x) > 0
      ) {
        return false;
      }

      vertex = nextVertex;
    }

    return true;
  }
  static scale(
    vertices: IVertex[],
    scaleX: number,
    scaleY: number,
    point?: IVector,
  ): IVertex[] {
    if (scaleX === 1 && scaleY === 1) {
      return vertices;
    }
    point = point || Vertices.centroid(vertices);
    let vertex;
    let delta;
    for (let i = 0; i < vertices.length; i++) {
      vertex = vertices[i];
      delta = Vector.subtract(vertex, point);
      vertices[i].x = point.x + delta.x * scaleX;
      vertices[i].y = point.y + delta.y * scaleY;
    }
    return vertices;
  }
  static chamfer(
    vertices: IVertex[],
    radius: number | number[] = [8],
    quality = -1,
    qualityMin = 2,
    qualityMax = 14,
  ) {
    radius = typeof radius === "number" ? [radius] : radius;
    const newVertices = [];

    for (let i = 0; i < vertices.length; i++) {
      const prevVertex = vertices[i - 1 >= 0 ? i - 1 : vertices.length - 1];
      const vertex = vertices[i];
      const nextVertex = vertices[(i + 1) % vertices.length];
      const currentRadius = radius[i < radius.length ? i : radius.length - 1];

      if (currentRadius === 0) {
        newVertices.push(vertex);
        continue;
      }

      const prevNormal = Vector.normalize({
        x: vertex.y - prevVertex.y,
        y: prevVertex.x - vertex.x,
      });

      const nextNormal = Vector.normalize({
        x: nextVertex.y - vertex.y,
        y: vertex.x - nextVertex.x,
      });

      const diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2));
      const radiusVector = Vector.multiply(
        Common.clone(prevNormal),
        currentRadius,
      );
      const midNormal = Vector.normalize(
        Vector.multiply(Vector.add(prevNormal, nextNormal), 0.5),
      );
      const scaledVertex = Vector.subtract(
        vertex,
        Vector.multiply(midNormal, diagonalRadius),
      );

      let precision = quality;

      if (quality === -1) {
        // automatically decide precision
        precision = Math.pow(currentRadius, 0.32) * 1.75;
      }

      precision = Common.clamp(precision, qualityMin, qualityMax);

      // use an even value for precision, more likely to reduce axes by using symmetry
      if (precision % 2 === 1) {
        precision += 1;
      }

      const alpha = Math.acos(Vector.dot(prevNormal, nextNormal));
      const theta = alpha / precision;

      for (let j = 0; j < precision; j++) {
        newVertices.push(
          Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex),
        );
      }
    }
    return newVertices;
  }
  static clockwiseSort(vertices: IVertex[]): IVertex[] {
    return vertices.sort((vertexA, vertexB) =>
      Vector.angle(Vertices.mean(vertices), vertexA) -
      Vector.angle(Vertices.mean(vertices), vertexB)
    );
  }
  static isConvex(vertices: IVertex[]): boolean | null {
    // http://paulbourke.net/geometry/polygonmesh/
    // Copyright (c) Paul Bourke (use permitted)

    let flag = 0;
    const n = vertices.length;
    let i;
    let j;
    let k;
    let z;

    if (n < 3) {
      return null;
    }

    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      k = (i + 2) % n;
      z = (vertices[j].x - vertices[i].x) * (vertices[k].y - vertices[j].y);
      z -= (vertices[j].y - vertices[i].y) * (vertices[k].x - vertices[j].x);

      if (z < 0) {
        flag |= 1;
      } else if (z > 0) {
        flag |= 2;
      }

      if (flag === 3) {
        return false;
      }
    }
    return flag !== 0 ? true : null;
  }
  static hull(vertices: IVertex[]): IVertex[] {
    // http://geomalgorithms.com/a10-_hull-1.html
    const upper = [];
    const lower = [];
    let vertex;
    let i;
    vertices = vertices.slice(0);
    vertices.sort((vertexA: IVertex, vertexB: IVertex) =>
      (vertexA.x - vertexB.x) !== 0
        ? (vertexA.x - vertexB.x)
        : vertexA.y - vertexB.y
    );
    for (i = 0; i < vertices.length; i += 1) {
      vertex = vertices[i];
      while (
        lower.length >= 2 &&
        Vector.cross3(
            lower[lower.length - 2],
            lower[lower.length - 1],
            vertex,
          ) <= 0
      ) {
        lower.pop();
      }
      lower.push(vertex);
    }
    for (i = vertices.length - 1; i >= 0; i -= 1) {
      vertex = vertices[i];
      while (
        upper.length >= 2 &&
        Vector.cross3(
            upper[upper.length - 2],
            upper[upper.length - 1],
            vertex,
          ) <= 0
      ) {
        upper.pop();
      }
      upper.push(vertex);
    }
    upper.pop();
    lower.pop();
    return upper.concat(lower);
  }
}

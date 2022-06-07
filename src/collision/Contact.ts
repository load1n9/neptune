import { Vertex } from "../geometry/Vertices.ts";

export class Contact {
  constructor(
    public vertex: Vertex,
    public normalImpulse = 0,
    public tangentImpulse = 0,
  ) {}
}

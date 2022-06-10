import type { IContact, IVertex } from "../types.ts";

export class Contact {
  static create(vertex: IVertex): IContact {
    return {
      vertex,
      normalImpulse: 0,
      tangentImpulse: 0,
    };
  }
}

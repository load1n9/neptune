import { IBody, IPair } from "../types.ts";
import { Contact } from "./Contact.ts";

export class Pair {
  // deno-lint-ignore no-explicit-any
  static create(collision: any, timestamp: number) {
    const bodyA = collision.bodyA;
    const bodyB = collision.bodyB;

    const pair: IPair = {
      id: Pair.id(bodyA, bodyB),
      bodyA: bodyA,
      bodyB: bodyB,
      collision: collision,
      contacts: [],
      activeContacts: [],
      separation: 0,
      isActive: true,
      confirmedActive: true,
      isSensor: bodyA.isSensor || bodyB.isSensor,
      timeCreated: timestamp,
      timeUpdated: timestamp,
      inverseMass: 0,
      friction: 0,
      frictionStatic: 0,
      restitution: 0,
      slop: 0,
    };

    Pair.update(pair, collision, timestamp);

    return pair;
  }

  // deno-lint-ignore no-explicit-any
  static update(pair: IPair, collision: any, timestamp: number) {
    const contacts = pair.contacts;
    const supports = collision.supports;
    const activeContacts = pair.activeContacts;
    const parentA = collision.parentA;
    const parentB = collision.parentB;
    const parentAVerticesLength = parentA.vertices.length;

    pair.isActive = true;
    pair.timeUpdated = timestamp;
    pair.collision = collision;
    pair.separation = collision.depth;
    pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
    pair.friction = parentA.friction < parentB.friction
      ? parentA.friction
      : parentB.friction;
    pair.frictionStatic = parentA.frictionStatic > parentB.frictionStatic
      ? parentA.frictionStatic
      : parentB.frictionStatic;
    pair.restitution = parentA.restitution > parentB.restitution
      ? parentA.restitution
      : parentB.restitution;
    pair.slop = parentA.slop > parentB.slop ? parentA.slop : parentB.slop;

    collision.pair = pair;
    activeContacts.length = 0;

    for (let i = 0; i < supports.length; i++) {
      const support = supports[i];
      const contactId = support.body === parentA
        ? support.index
        : parentAVerticesLength + support.index;
      const contact = contacts[contactId];

      if (contact) {
        activeContacts.push(contact);
      } else {
        activeContacts.push(contacts[contactId] = Contact.create(support));
      }
    }
  }

  static setActive(pair: IPair, isActive: boolean, timestamp: number) {
    if (isActive) {
      pair.isActive = true;
      pair.timeUpdated = timestamp;
    } else {
      pair.isActive = false;
      pair.activeContacts.length = 0;
    }
  }

  static id(bodyA: IBody, bodyB: IBody) {
    return bodyA < bodyB
      ? "A" + bodyA.id + "B" + bodyB.id
      : "A" + bodyB.id + "B" + bodyA.id;
  }
}

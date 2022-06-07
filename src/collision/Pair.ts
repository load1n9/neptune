// deno-lint-ignore-file no-explicit-any
import { Contact } from "./Contact.ts";

export class Pair {
  bodyA: any;
  bodyB: any;
  id: string;
  contacts: any[] = [];
  activeContacts: any[] = [];
  separation = 0;
  isActive = true;
  confirmedActive = true;
  isSensor: boolean;
  timeCreated: number;
  timeUpdated: number;
  inverseMass = 0;
  friction = 0;
  frictionStatic = 0;
  restitution = 0;
  slop = 0;
  constructor(public collision: any, timestamp: number) {
    this.bodyA = collision.bodyA;
    this.bodyB = collision.bodyB;
    this.id = Pair.id(this.bodyA, this.bodyB);
    this.isSensor = this.bodyA.isSensor || this.bodyB.isSensor;
    this.timeCreated = timestamp;
    this.timeUpdated = timestamp;
    this.update(this.collision, timestamp);
  }

  update(collision: any, timestamp: number): void {
    const contacts = this.contacts;
    const supports = collision.supports;
    const activeContacts = this.activeContacts;
    const parentA = collision.parentA;
    const parentB = collision.parentB;
    const parentAVerticesLength = parentA.vertices.length;

    this.isActive = true;
    this.timeUpdated = timestamp;
    this.collision = collision;
    this.separation = collision.depth;
    this.inverseMass = parentA.inverseMass + parentB.inverseMass;
    this.friction = parentA.friction < parentB.friction
      ? parentA.friction
      : parentB.friction;
    this.frictionStatic = parentA.frictionStatic > parentB.frictionStatic
      ? parentA.frictionStatic
      : parentB.frictionStatic;
    this.restitution = parentA.restitution > parentB.restitution
      ? parentA.restitution
      : parentB.restitution;
    this.slop = parentA.slop > parentB.slop ? parentA.slop : parentB.slop;
    collision.pair = this;
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
        activeContacts.push(contacts[contactId] = new Contact(support));
      }
    }
  }
  setActive(isActive: boolean, timestamp: number) {
    this.isActive = isActive;
    if (isActive) {
      this.timeUpdated = timestamp;
    } else {
      this.activeContacts.length = 0;
    }
  }
  static id(bodyA: any, bodyB: any): string {
    return bodyA.id < bodyB.id
      ? `A${bodyA.id}B${bodyB.id}`
      : `A${bodyB.id}B${bodyA.id}`;
  }
}

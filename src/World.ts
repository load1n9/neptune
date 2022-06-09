import { Composite } from "./body/Composite.ts";

export class Neptune {
  create = Composite.create;
  add = Composite.add;
  remove = Composite.remove;
  clear = Composite.clear;
  addComposite = Composite.addComposite;
  addBody = Composite.addBody;
  addConstraint = Composite.addConstraint;
}

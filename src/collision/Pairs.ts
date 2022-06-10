import type { IPair, IPairs } from "../types.ts";
import { Common } from "../core/Common.ts";
import { Pair } from "./Pair.ts";

export class Pairs {
  static create(options: Partial<IPairs>): IPairs {
    return Common.extend({
      table: {},
      list: [],
      collisionStart: [],
      collisionActive: [],
      collisionEnd: [],
    }, options);
  }
  // deno-lint-ignore no-explicit-any
  static update(pairs: IPairs, collisions: any[], timestamp: number) {
    const pairsList = pairs.list;
    let pairsListLength = pairsList.length;
    const pairsTable = pairs.table;
    const collisionsLength = collisions.length;
    const collisionStart = pairs.collisionStart;
    const collisionActive = pairs.collisionActive;
    const collisionEnd = pairs.collisionEnd;
    let collision;
    let pairIndex: number;
    let pair: IPair;

    collisionStart.length = 0;
    collisionEnd.length = 0;
    collisionActive.length = 0;
    for (let i = 0; i < pairsListLength; i++) {
      pairsList[i].confirmedActive = false;
    }

    for (let i = 0; i < collisionsLength; i++) {
      collision = collisions[i];
      pair = collision.pair;

      if (pair) {
        if (pair.isActive) {
          collisionActive.push(pair);
        } else {
          collisionStart.push(pair);
        }

        Pair.update(pair, collision, timestamp);
        pair.confirmedActive = true;
      } else {
        pair = Pair.create(collision, timestamp);
        pairsTable[pair.id] = pair;

        collisionStart.push(pair);
        pairsList.push(pair);
      }
    }
    const removePairIndex = [];
    pairsListLength = pairsList.length;

    for (let i = 0; i < pairsListLength; i++) {
      pair = pairsList[i];

      if (!pair.confirmedActive) {
        Pair.setActive(pair, false, timestamp);
        collisionEnd.push(pair);

        if (
          !pair.collision.bodyA.isSleeping && !pair.collision.bodyB.isSleeping
        ) {
          removePairIndex.push(i);
        }
      }
    }
    for (let i = 0; i < removePairIndex.length; i++) {
      pairIndex = removePairIndex[i] - i;
      pair = pairsList[pairIndex];
      pairsList.splice(pairIndex, 1);
      delete pairsTable[pair.id];
    }
  }
  static clear(pairs: IPairs): IPairs {
    pairs.table = {};
    pairs.list.length = 0;
    pairs.collisionStart.length = 0;
    pairs.collisionActive.length = 0;
    pairs.collisionEnd.length = 0;
    return pairs;
  }
}

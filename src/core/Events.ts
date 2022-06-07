// deno-lint-ignore-file no-explicit-any
import { Common } from "./Common.ts";

export class Events {
  static on(object: any, eventNames: string, callback: any) {
    const names = eventNames.split(" ");
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      object.events = object.events || {};
      object.events[name] = object.events[name] || [];
      object.events[name].push(callback);
    }
    return callback;
  }
  static off(object: any, eventNames: string, callback: any) {
    if (!eventNames) {
      object.events = {};
      return;
    }
    if (typeof eventNames === "function") {
      callback = eventNames;
      eventNames = Common.keys(object.events).join(" ");
    }
    const names = eventNames.split(" ");

    for (let i = 0; i < names.length; i++) {
      const callbacks = object.events[names[i]];
      const newCallbacks = [];

      if (callback && callbacks) {
        for (let j = 0; j < callbacks.length; j++) {
          if (callbacks[j] !== callback) {
            newCallbacks.push(callbacks[j]);
          }
        }
      }

      object.events[names[i]] = newCallbacks;
    }
  }
  static trigger(object: any, eventNames: string, event?: any) {
    let names;
    let name;
    let callbacks;
    let eventClone;
    const events = object.events;
    if (events && Common.keys(events).length > 0) {
      if (!event) {
        event = {};
      }
      names = eventNames.split(" ");
      for (let i = 0; i < names.length; i++) {
        name = names[i];
        callbacks = events[name];

        if (callbacks) {
          eventClone = Common.clone(event, false);
          eventClone.name = name;
          eventClone.source = object;

          for (let j = 0; j < callbacks.length; j++) {
            callbacks[j].apply(object, [eventClone]);
          }
        }
      }
    }
  }
}

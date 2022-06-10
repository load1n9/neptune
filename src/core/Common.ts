// deno-lint-ignore-file no-explicit-any
export class Common {
  static _nextId = 0;
  static _seed = 0;
  static _nowStartTime = +(new Date());
  static _warnedOnce: any = {};
  static _decomp: any = null;
  static _logLevel = 1;

  static extend(obj: any, deep: any = true, ..._args: any[]) {
    const argsStart = typeof deep === "boolean" ? 2 : 1;
    let deepClone: any;
    deep = typeof deep === "boolean" ? deep : true;
    for (let i = argsStart; i < arguments.length; i++) {
      const source = arguments[i];
      if (source) {
        for (const prop in source) {
          if (
            deepClone && source[prop] && source[prop].constructor === Object
          ) {
            if (!obj[prop] || obj[prop].constructor === Object) {
              obj[prop] = obj[prop] || {};
              Common.extend(obj[prop], deepClone, source[prop]);
            } else {
              obj[prop] = source[prop];
            }
          } else {
            obj[prop] = source[prop];
          }
        }
      }
    }
    return obj;
  }
  static clone(obj: any, deep: any = true) {
    return Common.extend({}, deep, obj);
  }
  static keys(obj: any) {
    return Object.keys(obj);
  }
  static values(obj: any) {
    const values = [];
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      values.push(obj[keys[i]]);
    }
    return values;
  }
  static get(obj: any, path: string, begin?: number, end?: number) {
    const _path = path.split(".").slice(begin, end);
    for (let i = 0; i < _path.length; i += 1) {
      obj = obj[_path[i]];
    }

    return obj;
  }

  static set(obj: any, path: string, val: any, begin?: number, end?: number) {
    const parts = path.split(".").slice(begin, end);
    Common.get(obj, path, 0, -1)[parts[parts.length - 1]] = val;
    return val;
  }

  static shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Common.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  static choose(choices: any) {
    return choices[Math.floor(Common.random() * choices.length)];
  }

  static isElement(obj: any) {
    return !!(obj && obj.nodeType && obj.nodeName);
  }

  static isArray(obj: any) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  }

  static isFunction(obj: any) {
    return typeof obj === "function";
  }

  static isPlainObject(obj: any) {
    return typeof obj === "object" && obj.constructor === Object;
  }

  static isString(obj: any) {
    return String.call(obj) === "[object String]";
  }

  static clamp(value: number, min: number, max: number) {
    return (value < min) ? min : (value > max) ? max : value;
  }

  static sign(value: number) {
    return value < 0 ? -1 : 1;
  }

  static now() {
    return window.performance.now();
  }

  static random(min = 0, max = 1) {
    return min + Common._seededRandom() * (max - min);
  }

  static _seededRandom() {
    // https://en.wikipedia.org/wiki/Linear_congruential_generator
    Common._seed = (Common._seed * 9301 + 49297) % 233280;
    return Common._seed / 233280;
  }

  static colorToNumber(colorString: string): number {
    colorString = colorString.replace("#", "");

    if (colorString.length == 3) {
      colorString = colorString.charAt(0) + colorString.charAt(0) +
        colorString.charAt(1) + colorString.charAt(1) +
        colorString.charAt(2) + colorString.charAt(2);
    }

    return parseInt(colorString, 16);
  }

  static log(...args: any[]) {
    if (console && Common._logLevel > 0 && Common._logLevel <= 3) {
      console.log.apply(
        console,
        ["neptune ~>"].concat(Array.prototype.slice.call(args)),
      );
    }
  }

  static info(...args: any[]) {
    if (console && Common._logLevel > 0 && Common._logLevel <= 2) {
      console.info.apply(
        console,
        ["neptune ~>"].concat(Array.prototype.slice.call(args)),
      );
    }
  }

  static warn(...args: any[]) {
    if (console && Common._logLevel > 0 && Common._logLevel <= 3) {
      console.warn.apply(
        console,
        ["neptune ~>"].concat(Array.prototype.slice.call(args)),
      );
    }
  }

  static warnOnce(...args: any[]) {
    const message = Array.prototype.slice.call(args).join(" ");
    if (!Common._warnedOnce[message]) {
      Common.warn(message);
      Common._warnedOnce[message] = true;
    }
  }

  static nextId() {
    return Common._nextId++;
  }

  static indexOf(haystack: any[], needle: any) {
    if (haystack.indexOf) {
      return haystack.indexOf(needle);
    }

    for (let i = 0; i < haystack.length; i++) {
      if (haystack[i] === needle) {
        return i;
      }
    }

    return -1;
  }

  static map(list: any[], func: any) {
    if (list.map) {
      return list.map(func);
    }

    const mapped = [];

    for (let i = 0; i < list.length; i += 1) {
      mapped.push(func(list[i]));
    }

    return mapped;
  }

  static topologicalSort(graph: any) {
    const result: any[] = [];
    const visited: any[] = [];
    const temp: any = [];

    for (const node of graph) {
      if (!visited[node] && !temp[node]) {
        Common._topologicalSort(node, visited, temp, graph, result);
      }
    }

    return result;
  }

  static _topologicalSort(
    node: any,
    visited: any,
    temp: any,
    graph: any,
    result: any,
  ) {
    const neighbors = graph[node] || [];
    temp[node] = true;

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];

      if (temp[neighbor]) {
        // skip circular dependencies
        continue;
      }

      if (!visited[neighbor]) {
        Common._topologicalSort(neighbor, visited, temp, graph, result);
      }
    }

    temp[node] = false;
    visited[node] = true;

    result.push(node);
  }

  static chain(...args: any[]) {
    const funcs: any[] = [];

    for (let i = 0; i < args.length; i += 1) {
      const func = args[i];

      if (func._chained) {
        // flatten already chained functions
        funcs.push.apply(funcs, func._chained);
      } else {
        funcs.push(func);
      }
    }

    const chain = (...args: any[]) => {
      // https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358
      let lastResult = new Array(args.length);
      const _args = new Array(arguments.length);

      for (let i = 0, l = arguments.length; i < l; i++) {
        args[i] = arguments[i];
      }

      for (let i = 0; i < funcs.length; i += 1) {
        const result = funcs[i].apply(lastResult, args);

        if (typeof result !== "undefined") {
          lastResult = result;
        }
      }

      return lastResult;
    };

    chain._chained = funcs;

    return chain;
  }

  static chainPathBefore(base: any, path: string, func: any) {
    return Common.set(
      base,
      path,
      Common.chain(
        func,
        Common.get(base, path),
      ),
    );
  }

  static chainPathAfter(base: any, path: string, func: any) {
    return Common.set(
      base,
      path,
      Common.chain(
        Common.get(base, path),
        func,
      ),
    );
  }

  static setDecomp(decomp: any) {
    Common._decomp = decomp;
  }

  static getDecomp() {
    return Common._decomp;
  }
}

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/msgFacade/index.ts
var msgFacade_exports = {};
__export(msgFacade_exports, {
  bidirectional: () => bidirectional,
  bidirectionalMany: () => bidirectionalMany,
  configs: () => commonConfigs_exports,
  obtain: () => obtain,
  obtainMany: () => obtainMany,
  share: () => share
});

// src/msgFacade/commonConfigs.ts
var commonConfigs_exports = {};
__export(commonConfigs_exports, {
  socketio: () => socketio,
  websocket: () => websocket,
  workers: () => workers
});
var workers = {
  send: "postMessage",
  receive: "message",
  onError: "error",
  onExit: "exit"
};
var socketio = {
  send: (socket, data) => {
    socket.emit("MSG_FACADE__DATA", data);
  },
  receive: (socket, cb) => {
    socket.on("MSG_FACADE__DATA", cb);
  },
  onError: "error",
  onExit: "disconnect"
};
var websocket = {
  send: (socket, data) => {
    socket.send("MSG_FACADE__DATA__" + JSON.stringify(data));
  },
  receive: (socket, cb) => {
    socket.addEventListener("message", (event) => {
      const data = event == null ? void 0 : event.data;
      if (data == null ? void 0 : data.startsWith("MSG_FACADE__DATA__")) {
        try {
          const obj = JSON.parse(data.replace(/^MSG_FACADE__DATA__/, ""));
          cb(obj);
        } catch (e) {
        }
      }
    });
  },
  onError: (socket, cb) => {
    socket.addEventListener("error", cb);
  },
  onExit: (socket, cb) => {
    socket.addEventListener("close", cb);
  }
};

// src/msgFacade/types.ts
var EventEmitter = class {
  constructor() {
    this.callbacks = {};
  }
  on(event, cb) {
    if (!this.callbacks[event])
      this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  }
  addListener(event, cb) {
    this.on(event, cb);
  }
  emit(event, ...data) {
    let cbs = this.callbacks[event];
    if (cbs) {
      cbs.forEach((cb) => cb(...data));
    }
  }
  removeListener(event, cb) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter((c) => c !== cb);
    }
  }
  removeAllListeners(event) {
    this.callbacks[event] = [];
  }
};

// src/msgFacade/getProxy.ts
var getProxy = (item, config) => {
  const send = (msg) => {
    if (typeof config.send === "string") {
      const result = item[config.send](msg);
      return result;
    } else {
      const result = config.send(item, msg);
      return result;
    }
  };
  const receive = new EventEmitter();
  if (typeof config.receive === "string") {
    item.on(config.receive, (msg) => {
      receive.emit("message", msg);
    });
  } else {
    config.receive(item, (msg) => {
      receive.emit("message", msg);
    });
  }
  if (config.onError) {
    if (typeof config.onError === "string") {
      item.on(config.onError, (error) => {
        receive.emit("error", error);
      });
    } else {
      config.onError(item, (err) => {
        receive.emit("error", err);
      });
    }
  }
  if (config.onExit) {
    if (typeof config.onExit === "string") {
      item.on(config.onExit, (...args) => {
        receive.emit("exit", ...args);
      });
    } else {
      config.onExit(item, (...args) => {
        receive.emit("exit", ...args);
      });
    }
  }
  return { send, receive, item };
};
var getProxies = (remoteItems, config, existing = []) => {
  const existingRemoteItems = existing.map((proxy) => proxy.item);
  const existingInRemoteItems = existing.filter((proxy) => remoteItems.includes(proxy.item));
  const newRemoteItems = remoteItems.filter((item) => !existingRemoteItems.includes(item));
  const newProxies = newRemoteItems.map((item) => getProxy(item, config));
  const full = [...existingInRemoteItems, ...newProxies];
  const added = newProxies;
  return {
    full,
    added
  };
};

// src/msgFacade/handleNear.ts
var handleNear = (obj, { send, receive }) => {
  const functions = Object.keys(obj);
  receive.on("message", async (msg) => {
    if (msg.type === "trigger-list")
      return send({ type: "result-list", functions });
    if (msg.type !== "trigger")
      return;
    const value = obj[msg.name];
    if (!value)
      throw new Error(`Function ${msg.name} does not exist`);
    const result = typeof value === "function" ? value(...msg.args || []) : value;
    const awaited = await result;
    send({ type: "result", id: msg.id, result: awaited });
  });
  send({ type: "result-list", functions });
};

// src/msgFacade/handleFar.ts
import { PromiseUtils } from "swiss-ak";
var listen = (receive, msgListener, errListener) => {
  const mList = (msg) => msgListener(removeListeners)(msg);
  const eList = (err) => errListener(removeListeners)(err);
  const removeListeners = () => {
    receive.removeListener("message", mList);
    receive.removeListener("error", eList);
  };
  receive.on("message", mList);
  receive.on("error", eList);
};
var getFunctionList = ({ send, receive }) => new Promise((resolve, reject) => {
  listen(
    receive,
    (rmv) => (msg) => {
      if (msg.type !== "result-list")
        return;
      rmv();
      resolve(msg.functions);
    },
    (rmv) => (err) => {
      rmv();
      reject(err);
    }
  );
  send({ type: "trigger-list" });
});
var callFunctionOnProxy = async (proxy, fnName, fnArgs) => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const id = Math.random().toString(36).slice(2);
    listen(
      proxy.receive,
      (rmv) => (msg) => {
        if (resolved)
          return;
        if (msg.type !== "result" || msg.id !== id)
          return;
        resolved = true;
        rmv();
        resolve(msg.result);
      },
      (rmv) => (err) => {
        if (resolved)
          return;
        rmv();
        reject(err);
      }
    );
    proxy.send({ type: "trigger", name: fnName, args: fnArgs, id });
  });
};
var handleFar = async (proxy) => {
  const functions = await getFunctionList(proxy);
  const callFunction = (fnName) => async (...fnArgs) => callFunctionOnProxy(proxy, fnName, fnArgs);
  const callObj = Object.fromEntries(functions.map((fnName) => [fnName, callFunction(fnName)]));
  return callObj;
};
var handleManyFar = async (proxies) => {
  let functions = [];
  let proxyList = [];
  const replaceProxies = async (added, allProxies) => {
    proxyList = allProxies;
    const newFunctions = await PromiseUtils.map(added, (p) => getFunctionList(p));
    functions = [.../* @__PURE__ */ new Set([...functions, ...newFunctions.flat()])];
  };
  await replaceProxies(proxies, proxies);
  const callFunction = (fnName) => async (...fnArgs) => {
    return PromiseUtils.map(proxyList, (proxy) => callFunctionOnProxy(proxy, fnName, fnArgs));
  };
  const callObj = Object.fromEntries(functions.map((fnName) => [fnName, callFunction(fnName)]));
  return {
    callObj,
    replaceProxies
  };
};

// src/msgFacade/handleExit.ts
import { getDeferred } from "swiss-ak";
var handleExit = (proxy) => {
  const deferred = getDeferred();
  proxy.receive.removeAllListeners("exit");
  proxy.receive.on("exit", (value) => {
    deferred.resolve({
      proxy,
      value
    });
  });
  return deferred;
};

// src/msgFacade/functions.ts
var bidirectional = async (shared, item, config) => {
  const proxy = getProxy(item, config);
  const deferred = handleExit(proxy);
  const _near = handleNear(shared, proxy);
  const result = await handleFar(proxy);
  return {
    ...result,
    promise: deferred.promise.then(({ value }) => value)
  };
};
var share = async (shared, item, config) => {
  const proxy = getProxy(item, config);
  const deferred = handleExit(proxy);
  const _near = handleNear(shared, proxy);
  return {
    promise: deferred.promise.then(({ value }) => value)
  };
};
var obtain = async (item, config) => {
  const proxy = getProxy(item, config);
  const deferred = handleExit(proxy);
  const result = await handleFar(proxy);
  return {
    ...result,
    promise: deferred.promise.then(({ value }) => value)
  };
};
var manyFarWrapper = async (remoteItems, config, addedIterator) => {
  let proxies = [];
  let replaceProxies = async () => {
  };
  const setup = async (added) => {
    added.forEach((proxy, index) => {
      handleExit(proxy).promise.then(() => {
        const newRemoteItems = proxies.map((p) => p.item).filter((item) => item !== proxy.item);
        updateRemoteItems(newRemoteItems);
      });
      if (addedIterator)
        addedIterator(proxy, index, proxies);
    });
    await replaceProxies(added, proxies);
  };
  const updateRemoteItems = async (newRemoteItems) => {
    const { full, added } = getProxies(newRemoteItems, config, proxies);
    proxies = full;
    await setup(added);
  };
  const addRemoteItems = async (newRemoteItems) => {
    const { added } = getProxies(newRemoteItems, config, proxies);
    proxies = [...proxies, ...added];
    await setup(added);
  };
  await updateRemoteItems(remoteItems);
  const manyFar = await handleManyFar(proxies);
  replaceProxies = manyFar.replaceProxies;
  return {
    ...manyFar.callObj,
    addRemoteItems,
    updateRemoteItems
  };
};
var bidirectionalMany = async (shared, remoteItems, config) => {
  return manyFarWrapper(remoteItems, config, (proxy) => {
    handleNear(shared, proxy);
  });
};
var obtainMany = async (remoteItems, config) => {
  return manyFarWrapper(remoteItems, config);
};

// src/index.ts
var src_default = msgFacade_exports;
export {
  EventEmitter,
  bidirectional,
  bidirectionalMany,
  commonConfigs_exports as configs,
  src_default as default,
  obtain,
  obtainMany,
  share
};

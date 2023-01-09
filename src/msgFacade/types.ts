export class EventEmitter {
  callbacks: { [s: string]: ((...args: any[]) => any)[] };

  constructor() {
    this.callbacks = {};
  }

  on(event: string, cb: (...data: any[]) => any) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  }

  addListener(event: string, cb: (...data: any[]) => any) {
    this.on(event, cb);
  }

  emit(event: string, ...data: any[]) {
    let cbs = this.callbacks[event];
    if (cbs) {
      cbs.forEach((cb) => cb(...data));
    }
  }

  removeListener(event: string, cb: (...data: any[]) => any) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter((c) => c !== cb);
    }
  }

  removeAllListeners(event: string) {
    this.callbacks[event] = [];
  }
}

export interface MsgFacadeProxy<I> {
  send: (msg: MsgFacadeMessage) => any;
  receive: EventEmitter;
  item: I;
}

export interface MsgFacadeConfig<I> {
  receive: string | ((item: I, cb: (data: MsgFacadeMessage) => void) => void);
  send: string | ((item: I, data: MsgFacadeMessage) => void);
  onError?: string | ((item: I, cb: (err: any) => void) => void);
  onExit?: string | ((item: I, cb: (...args: any[]) => void) => void);
}

export interface MsgFacadeMessage {
  type: string;
}

export interface MsgFacadeTriggerList extends MsgFacadeMessage {
  type: 'trigger-list';
  functions: string[];
}

export interface MsgFacadeResultList extends MsgFacadeMessage {
  type: 'result-list';
  functions: string[];
}

export interface MsgFacadeTrigger extends MsgFacadeMessage {
  type: 'trigger';
  id: string;
  name: string;
  args: any[];
}

export interface MsgFacadeResult extends MsgFacadeMessage {
  type: 'result';
  id: string;
  result: any;
}

// The given type, or if it's a promise, the type of the promise's value
type UnWrapPromise<T> = T extends Promise<infer U> ? U : T;

// If the given type is a function, return the return type, otherwise return the type itself
type StripFunctions<T> = T extends (...args: any[]) => infer R ? R : T;

// Replace the return type of a function with the given type
type ReplaceReturnType<T extends (...args: any) => any, Z> = (...args: Parameters<T>) => Z;

// If the given type is a function, return the function, otherwise return a function that returns the given type
type Functionalise<T> = T extends (...args: any[]) => any ? T : () => T;

// For each property of the given object, return a function that returns a promise of the property's type,
// or if the property is a function, return a function with the same arguments that returns a promise of the function's return type
export type MappedMsgFacade<T> = { [K in keyof T]: ReplaceReturnType<Functionalise<T[K]>, Promise<UnWrapPromise<StripFunctions<T[K]>>>> };

// For each property of the given object, return a function that returns a promise of an array of the property's type,
// or if the property is a function, return a function with the same arguments that returns a promise of an array the function's return type
export type MappedMsgFacadeMany<T> = { [K in keyof T]: ReplaceReturnType<Functionalise<T[K]>, Promise<UnWrapPromise<StripFunctions<T[K]>>[]>> };

export type MsgFacade<T> = MappedMsgFacade<T> & {
  promise: Promise<number>;
};

export type MsgFacadeMany<T, I> = MappedMsgFacadeMany<T> & {
  addRemoteItems: (remoteItems: I[]) => Promise<void>;
  updateRemoteItems: (remoteItems: I[]) => Promise<void>;
};

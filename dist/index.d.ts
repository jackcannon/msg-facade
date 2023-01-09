declare class EventEmitter {
    callbacks: {
        [s: string]: ((...args: any[]) => any)[];
    };
    constructor();
    on(event: string, cb: (...data: any[]) => any): void;
    addListener(event: string, cb: (...data: any[]) => any): void;
    emit(event: string, ...data: any[]): void;
    removeListener(event: string, cb: (...data: any[]) => any): void;
    removeAllListeners(event: string): void;
}
interface MsgFacadeProxy<I> {
    send: (msg: MsgFacadeMessage) => any;
    receive: EventEmitter;
    item: I;
}
interface MsgFacadeConfig<I> {
    receive: string | ((item: I, cb: (data: MsgFacadeMessage) => void) => void);
    send: string | ((item: I, data: MsgFacadeMessage) => void);
    onError?: string | ((item: I, cb: (err: any) => void) => void);
    onExit?: string | ((item: I, cb: (...args: any[]) => void) => void);
}
interface MsgFacadeMessage {
    type: string;
}
interface MsgFacadeTriggerList extends MsgFacadeMessage {
    type: 'trigger-list';
    functions: string[];
}
interface MsgFacadeResultList extends MsgFacadeMessage {
    type: 'result-list';
    functions: string[];
}
interface MsgFacadeTrigger extends MsgFacadeMessage {
    type: 'trigger';
    id: string;
    name: string;
    args: any[];
}
interface MsgFacadeResult extends MsgFacadeMessage {
    type: 'result';
    id: string;
    result: any;
}
type UnWrapPromise<T> = T extends Promise<infer U> ? U : T;
type StripFunctions<T> = T extends (...args: any[]) => infer R ? R : T;
type ReplaceReturnType<T extends (...args: any) => any, Z> = (...args: Parameters<T>) => Z;
type Functionalise<T> = T extends (...args: any[]) => any ? T : () => T;
type MappedMsgFacade<T> = {
    [K in keyof T]: ReplaceReturnType<Functionalise<T[K]>, Promise<UnWrapPromise<StripFunctions<T[K]>>>>;
};
type MappedMsgFacadeMany<T> = {
    [K in keyof T]: ReplaceReturnType<Functionalise<T[K]>, Promise<UnWrapPromise<StripFunctions<T[K]>>[]>>;
};
type MsgFacade<T> = MappedMsgFacade<T> & {
    promise: Promise<number>;
};
type MsgFacadeMany<T, I> = MappedMsgFacadeMany<T> & {
    addRemoteItems: (remoteItems: I[]) => Promise<void>;
    updateRemoteItems: (remoteItems: I[]) => Promise<void>;
};

declare const workers: MsgFacadeConfig<any>;
declare const socketio: MsgFacadeConfig<any>;
declare const websocket: MsgFacadeConfig<any>;

declare const commonConfigs_socketio: typeof socketio;
declare const commonConfigs_websocket: typeof websocket;
declare const commonConfigs_workers: typeof workers;
declare namespace commonConfigs {
  export {
    commonConfigs_socketio as socketio,
    commonConfigs_websocket as websocket,
    commonConfigs_workers as workers,
  };
}

declare const bidirectional: <NearT extends Object, FarT extends Object, I extends unknown = EventEmitter>(shared: NearT, item: I, config: MsgFacadeConfig<I>) => Promise<MsgFacade<FarT>>;
declare const share: <T extends Object, I extends unknown = EventEmitter>(shared: T, item: I, config: MsgFacadeConfig<I>) => Promise<{
    promise: Promise<any>;
}>;
declare const obtain: <T extends Object, I extends unknown = EventEmitter>(item: I, config: MsgFacadeConfig<I>) => Promise<MsgFacade<T>>;
declare const bidirectionalMany: <NearT extends Object, FarT extends Object, I extends unknown = EventEmitter>(shared: NearT, remoteItems: I[], config: MsgFacadeConfig<I>) => Promise<MsgFacadeMany<FarT, I>>;
declare const obtainMany: <T extends Object, I extends unknown = EventEmitter>(remoteItems: I[], config: MsgFacadeConfig<I>) => Promise<MsgFacadeMany<T, I>>;

declare const msgFacade_bidirectional: typeof bidirectional;
declare const msgFacade_bidirectionalMany: typeof bidirectionalMany;
declare const msgFacade_obtain: typeof obtain;
declare const msgFacade_obtainMany: typeof obtainMany;
declare const msgFacade_share: typeof share;
declare namespace msgFacade {
  export {
    msgFacade_bidirectional as bidirectional,
    msgFacade_bidirectionalMany as bidirectionalMany,
    commonConfigs as configs,
    msgFacade_obtain as obtain,
    msgFacade_obtainMany as obtainMany,
    msgFacade_share as share,
  };
}

export { EventEmitter, MappedMsgFacade, MappedMsgFacadeMany, MsgFacade, MsgFacadeConfig, MsgFacadeMany, MsgFacadeMessage, MsgFacadeProxy, MsgFacadeResult, MsgFacadeResultList, MsgFacadeTrigger, MsgFacadeTriggerList, bidirectional, bidirectionalMany, commonConfigs as configs, msgFacade as default, obtain, obtainMany, share };

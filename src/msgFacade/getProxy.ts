import { MsgFacadeConfig, MsgFacadeMessage, MsgFacadeProxy, EventEmitter } from './types';

export const getProxy = <I extends any>(item: I, config: MsgFacadeConfig<I>): MsgFacadeProxy<I> => {
  const send = (msg: MsgFacadeMessage) => {
    if (typeof config.send === 'string') {
      const result = item[config.send](msg);
      return result;
    } else {
      const result = config.send(item, msg);
      return result;
    }
  };

  // receive RECEIVES messages and errors only. Outbound messages should be sent directly to the item
  const receive = new EventEmitter();
  if (typeof config.receive === 'string') {
    (item as EventEmitter).on(config.receive, (msg: MsgFacadeMessage) => {
      receive.emit('message', msg);
    });
  } else {
    config.receive(item, (msg: MsgFacadeMessage) => {
      receive.emit('message', msg);
    });
  }
  if (config.onError) {
    if (typeof config.onError === 'string') {
      (item as EventEmitter).on(config.onError, (error: any) => {
        receive.emit('error', error);
      });
    } else {
      config.onError(item, (err: any) => {
        receive.emit('error', err);
      });
    }
  }
  if (config.onExit) {
    if (typeof config.onExit === 'string') {
      (item as EventEmitter).on(config.onExit, (...args: any[]) => {
        receive.emit('exit', ...args);
      });
    } else {
      config.onExit(item, (...args: any[]) => {
        receive.emit('exit', ...args);
      });
    }
  }

  return { send, receive, item };
};

export const getProxies = <I extends any>(
  remoteItems: I[],
  config: MsgFacadeConfig<I>,
  existing: MsgFacadeProxy<I>[] = []
): { full: MsgFacadeProxy<I>[]; added: MsgFacadeProxy<I>[] } => {
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

import { getProxies, getProxy } from './getProxy';
import { MsgFacade, MsgFacadeConfig, EventEmitter, MsgFacadeProxy, MsgFacadeMany } from './types';

import { handleNear } from './handleNear';
import { handleFar, handleManyFar } from './handleFar';
import { handleExit } from './handleExit';

// Near = receives 'trigger', sends 'result'
// Far = sends 'trigger', receives 'result'

// TODO docs
export const bidirectional = async <NearT extends Object, FarT extends Object, I extends any = EventEmitter>(
  shared: NearT,
  item: I,
  config: MsgFacadeConfig<I>
): Promise<MsgFacade<FarT>> => {
  const proxy = getProxy<I>(item, config);

  const deferred = handleExit(proxy);
  const _near = handleNear<NearT>(shared, proxy);
  const result = await handleFar<FarT>(proxy);

  return {
    ...result,
    promise: deferred.promise.then(({ value }) => value)
  } as MsgFacade<FarT>;
};

// TODO docs
export const share = async <T extends Object, I extends any = EventEmitter>(
  shared: T,
  item: I,
  config: MsgFacadeConfig<I>
): Promise<{ promise: Promise<any> }> => {
  const proxy = getProxy<I>(item, config);

  const deferred = handleExit(proxy);
  const _near = handleNear<T>(shared, proxy);

  return {
    promise: deferred.promise.then(({ value }) => value)
  };
};

// TODO docs
export const obtain = async <T extends Object, I extends any = EventEmitter>(item: I, config: MsgFacadeConfig<I>): Promise<MsgFacade<T>> => {
  const proxy = getProxy<I>(item, config);

  const deferred = handleExit(proxy);
  const result = await handleFar<T>(proxy);

  return {
    ...result,
    promise: deferred.promise.then(({ value }) => value)
  } as MsgFacade<T>;
};

const manyFarWrapper = async <T extends Object, I extends any = EventEmitter>(
  remoteItems: I[],
  config: MsgFacadeConfig<I>,
  addedIterator?: (newProxy: MsgFacadeProxy<I>, index: number, all: MsgFacadeProxy<I>[]) => void
): Promise<MsgFacadeMany<T, I>> => {
  let proxies: MsgFacadeProxy<I>[] = [];
  let replaceProxies: (added: MsgFacadeProxy<any>[], allProxies: MsgFacadeProxy<any>[]) => Promise<void> = async () => {};

  // private
  const setup = async (added: MsgFacadeProxy<I>[]): Promise<void> => {
    added.forEach((proxy, index) => {
      handleExit(proxy).promise.then(() => {
        const newRemoteItems = proxies.map((p) => p.item).filter((item) => item !== proxy.item);
        updateRemoteItems(newRemoteItems);
      });
      if (addedIterator) addedIterator(proxy, index, proxies);
    });
    await replaceProxies(added, proxies);
  };

  // public
  const updateRemoteItems = async (newRemoteItems: I[]): Promise<void> => {
    const { full, added } = getProxies<I>(newRemoteItems, config, proxies);
    proxies = full;
    await setup(added);
  };
  const addRemoteItems = async (newRemoteItems: I[]): Promise<void> => {
    const { added } = getProxies<I>(newRemoteItems, config, proxies);
    proxies = [...proxies, ...added];
    await setup(added);
  };

  await updateRemoteItems(remoteItems);

  const manyFar = await handleManyFar<T>(proxies);
  replaceProxies = manyFar.replaceProxies;

  return {
    ...manyFar.callObj,
    addRemoteItems,
    updateRemoteItems
  } as MsgFacadeMany<T, I>;
};

// TODO docs
export const bidirectionalMany = async <NearT extends Object, FarT extends Object, I extends any = EventEmitter>(
  shared: NearT,
  remoteItems: I[],
  config: MsgFacadeConfig<I>
): Promise<MsgFacadeMany<FarT, I>> => {
  return manyFarWrapper<FarT, I>(remoteItems, config, (proxy) => {
    handleNear<NearT>(shared, proxy);
  });
};

// TODO docs
export const obtainMany = async <T extends Object, I extends any = EventEmitter>(
  remoteItems: I[],
  config: MsgFacadeConfig<I>
): Promise<MsgFacadeMany<T, I>> => {
  return manyFarWrapper<T, I>(remoteItems, config);
};

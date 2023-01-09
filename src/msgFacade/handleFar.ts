import { PromiseUtils } from 'swiss-ak';
import {
  MappedMsgFacade,
  MsgFacadeResultList,
  MsgFacadeProxy,
  MsgFacadeResult,
  MsgFacadeTrigger,
  MsgFacadeTriggerList,
  EventEmitter,
  MappedMsgFacadeMany
} from './types';

const listen = (
  receive: EventEmitter,
  msgListener: (remove: () => void) => (msg: any) => void,
  errListener: (remove: () => void) => (err: any) => void
) => {
  const mList = (msg: any) => msgListener(removeListeners)(msg);
  const eList = (err: any) => errListener(removeListeners)(err);

  const removeListeners = () => {
    receive.removeListener('message', mList);
    receive.removeListener('error', eList);
  };

  receive.on('message', mList);
  receive.on('error', eList);
};

const getFunctionList = ({ send, receive }: MsgFacadeProxy<any>): Promise<string[]> =>
  new Promise<string[]>((resolve, reject) => {
    listen(
      receive,
      (rmv) => (msg: MsgFacadeResultList) => {
        if (msg.type !== 'result-list') return;
        rmv();
        resolve(msg.functions);
      },
      (rmv) => (err) => {
        rmv();
        reject(err);
      }
    );
    send({ type: 'trigger-list' } as MsgFacadeTriggerList);
  });

const callFunctionOnProxy = async (proxy: MsgFacadeProxy<any>, fnName: string, fnArgs: any[]) => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const id = Math.random().toString(36).slice(2);

    listen(
      proxy.receive,
      (rmv) => (msg: MsgFacadeResult) => {
        if (resolved) return;
        if (msg.type !== 'result' || msg.id !== id) return;
        resolved = true;
        rmv();
        resolve(msg.result);
      },
      (rmv) => (err) => {
        if (resolved) return;
        rmv();
        reject(err);
      }
    );

    proxy.send({ type: 'trigger', name: fnName, args: fnArgs, id } as MsgFacadeTrigger);
  });
};

export const handleFar = async <T extends Object>(proxy: MsgFacadeProxy<any>): Promise<MappedMsgFacade<T>> => {
  const functions = await getFunctionList(proxy);

  const callFunction =
    (fnName: string) =>
    async (...fnArgs: any[]): Promise<any> =>
      callFunctionOnProxy(proxy, fnName, fnArgs);

  const callObj = Object.fromEntries(functions.map((fnName) => [fnName, callFunction(fnName)])) as unknown as MappedMsgFacade<T>;

  return callObj;
};

export const handleManyFar = async <T extends Object>(proxies: MsgFacadeProxy<any>[]) => {
  let functions: string[] = [];
  let proxyList: MsgFacadeProxy<any>[] = [];

  const replaceProxies = async (added: MsgFacadeProxy<any>[], allProxies: MsgFacadeProxy<any>[]) => {
    proxyList = allProxies;
    const newFunctions = await PromiseUtils.map(added, (p) => getFunctionList(p));

    functions = [...new Set([...functions, ...newFunctions.flat()])];
  };
  await replaceProxies(proxies, proxies);

  const callFunction =
    (fnName: string) =>
    async (...fnArgs: any[]): Promise<any> => {
      return PromiseUtils.map(proxyList, (proxy) => callFunctionOnProxy(proxy, fnName, fnArgs));
    };

  const callObj = Object.fromEntries(functions.map((fnName) => [fnName, callFunction(fnName)])) as unknown as MappedMsgFacadeMany<T>;

  return {
    callObj,
    replaceProxies
  };
};

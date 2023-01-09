import { DeferredPromise, getDeferred } from '../PromiseUtils';
import { MsgFacadeProxy } from './types';

export const handleExit = (proxy: MsgFacadeProxy<any>): DeferredPromise<{ proxy: MsgFacadeProxy<any>; value: any }> => {
  const deferred = getDeferred<{ proxy: MsgFacadeProxy<any>; value: any }>();
  proxy.receive.removeAllListeners('exit');
  proxy.receive.on('exit', (value) => {
    deferred.resolve({
      proxy,
      value
    });
  });

  return deferred;
};

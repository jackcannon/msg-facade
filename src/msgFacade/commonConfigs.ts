import { MsgFacadeConfig, MsgFacadeMessage } from './types';

export const workers: MsgFacadeConfig<any> = {
  send: 'postMessage',
  receive: 'message',
  onError: 'error',
  onExit: 'exit'
};

export const socketio: MsgFacadeConfig<any> = {
  send: (socket: any, data: MsgFacadeMessage) => {
    socket.emit('MSG_FACADE__DATA', data);
  },
  receive: (socket: any, cb: (data: MsgFacadeMessage) => void) => {
    socket.on('MSG_FACADE__DATA', cb);
  },
  onError: 'error',
  onExit: 'disconnect'
};

export const websocket: MsgFacadeConfig<any> = {
  send: (socket: any, data: MsgFacadeMessage) => {
    socket.send('MSG_FACADE__DATA__' + JSON.stringify(data));
  },
  receive: (socket: any, cb: (data: MsgFacadeMessage) => void) => {
    socket.addEventListener('message', (event: any) => {
      const data = event?.data;
      if (data?.startsWith('MSG_FACADE__DATA__')) {
        try {
          const obj: MsgFacadeMessage = JSON.parse(data.replace(/^MSG_FACADE__DATA__/, ''));
          cb(obj);
        } catch (e) {
          // do nothing
        }
      }
    });
  },
  onError: (socket: any, cb: (err) => void) => {
    socket.addEventListener('error', cb);
  },
  onExit: (socket: any, cb: () => void) => {
    socket.addEventListener('close', cb);
  }
};

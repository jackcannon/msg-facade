import { MsgFacadeResultList, MsgFacadeProxy, MsgFacadeResult, MsgFacadeTrigger, MsgFacadeTriggerList } from './types';

export const handleNear = <T extends Object>(obj: T, { send, receive }: MsgFacadeProxy<any>) => {
  const functions = Object.keys(obj);

  receive.on('message', async (msg: MsgFacadeTrigger | MsgFacadeTriggerList) => {
    if (msg.type === 'trigger-list') return send({ type: 'result-list', functions } as MsgFacadeResultList);

    if (msg.type !== 'trigger') return;

    const value = obj[msg.name];
    if (!value) throw new Error(`Function ${msg.name} does not exist`);

    const result = typeof value === 'function' ? value(...(msg.args || [])) : value;
    const awaited = await result;

    send({ type: 'result', id: msg.id, result: awaited } as MsgFacadeResult);
  });

  send({ type: 'result-list', functions } as MsgFacadeResultList);
};

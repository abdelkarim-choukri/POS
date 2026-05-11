import { EventGateway } from './event.gateway';

describe('EventGateway', () => {
  it('emitToRoom calls server.to().emit() with the correct room, event, and payload', () => {
    const gateway = new EventGateway();
    const emitFn = jest.fn();
    const toFn = jest.fn().mockReturnValue({ emit: emitFn });
    (gateway as any).server = { to: toFn };

    gateway.emitToRoom('kds:biz-1', 'kds:items_added', { items: [{ id: 'item-1' }] });

    expect(toFn).toHaveBeenCalledWith('kds:biz-1');
    expect(emitFn).toHaveBeenCalledWith('kds:items_added', { items: [{ id: 'item-1' }] });
  });
});

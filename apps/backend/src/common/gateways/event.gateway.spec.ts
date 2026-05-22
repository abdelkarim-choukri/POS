import { JwtService } from '@nestjs/jwt';
import { EventGateway } from './event.gateway';

function makeGateway(jwtVerify: jest.Mock): EventGateway {
  const jwtService = { verify: jwtVerify } as unknown as JwtService;
  return new EventGateway(jwtService);
}

describe('EventGateway', () => {
  describe('emitToRoom', () => {
    it('calls server.to().emit() with the correct room, event, and payload', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const emitFn = jest.fn();
      const toFn = jest.fn().mockReturnValue({ emit: emitFn });
      (gateway as any).server = { to: toFn };

      gateway.emitToRoom('kds:biz-1', 'kds:items_added', { items: [{ id: 'item-1' }] });

      expect(toFn).toHaveBeenCalledWith('kds:biz-1');
      expect(emitFn).toHaveBeenCalledWith('kds:items_added', { items: [{ id: 'item-1' }] });
    });
  });

  describe('handleConnection', () => {
    it('disconnects client when token is missing', () => {
      const gateway = makeGateway(jest.fn().mockImplementation(() => { throw new Error('invalid'); }));
      const disconnect = jest.fn();
      const client: any = { handshake: { auth: {}, query: {} }, disconnect, join: jest.fn() };
      gateway.handleConnection(client);
      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects client when token is invalid', () => {
      const gateway = makeGateway(jest.fn().mockImplementation(() => { throw new Error('invalid'); }));
      const disconnect = jest.fn();
      const client: any = {
        handshake: { auth: { token: 'bad-token' }, query: { room: 'dashboard:biz-1' } },
        disconnect,
        join: jest.fn(),
      };
      gateway.handleConnection(client);
      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('allows client to join matching business room with valid token', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1', type: 'user' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-1' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      expect(join).toHaveBeenCalledWith('dashboard:biz-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('rejects room join when room business_id does not match token claim', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1', type: 'user' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-OTHER' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      // Client stays connected but is NOT joined to a foreign room
      expect(join).not.toHaveBeenCalled();
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('allows super_admin to join any room', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'sa-1', type: 'super_admin' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-ANY' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      expect(join).toHaveBeenCalledWith('dashboard:biz-ANY');
    });
  });

  describe('handleJoin', () => {
    it('joins authenticated client to their own business room', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
        disconnect: jest.fn(),
        join,
        data: { user: { business_id: 'biz-1', type: 'user' } },
      };
      gateway.handleJoin(client, { room: 'floor:biz-1' });
      expect(join).toHaveBeenCalledWith('floor:biz-1');
    });

    it('rejects join to foreign business room', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
        disconnect: jest.fn(),
        join,
        data: { user: { business_id: 'biz-1', type: 'user' } },
      };
      gateway.handleJoin(client, { room: 'floor:biz-OTHER' });
      expect(join).not.toHaveBeenCalled();
    });
  });
});

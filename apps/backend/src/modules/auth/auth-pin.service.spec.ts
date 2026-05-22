import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { SuperAdmin } from '../../common/entities/super-admin.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

const BIZ_ID = 'biz-1';

function makeUser(overrides: any = {}) {
  return {
    id: 'user-1',
    email: 'emp@test.com',
    first_name: 'Ali',
    last_name: 'Hassan',
    role: 'employee',
    business_id: BIZ_ID,
    permissions: {},
    is_active: true,
    needs_pin_reset: false,
    pin_hash: null,
    ...overrides,
  };
}

async function buildService(userFind: jest.Mock, terminalFindOne: jest.Mock) {
  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
      {
        provide: getRepositoryToken(User),
        useValue: { find: userFind, findOne: jest.fn() },
      },
      { provide: getRepositoryToken(SuperAdmin), useValue: { findOne: jest.fn() } },
      { provide: getRepositoryToken(Terminal), useValue: { findOne: terminalFindOne } },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

const makeTerminal = () => ({
  id: 'term-1',
  terminal_code: 'T001',
  device_name: 'iPad 1',
  is_active: true,
  location_id: 'loc-1',
  location: { id: 'loc-1', name: 'Main', business_id: BIZ_ID },
});

describe('AuthService PIN login', () => {
  it('rejects when no user has a matching pin hash', async () => {
    const pinHash = await bcrypt.hash('9999', 10);
    const userFind = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: false }),
    ]);
    const service = await buildService(userFind, jest.fn().mockResolvedValue(makeTerminal()));
    await expect(service.pinLogin('1234', 'T001')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when matching user has needs_pin_reset=true', async () => {
    const pinHash = await bcrypt.hash('1234', 10);
    const userFind = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: true }),
    ]);
    const service = await buildService(userFind, jest.fn().mockResolvedValue(makeTerminal()));
    await expect(service.pinLogin('1234', 'T001')).rejects.toMatchObject({
      response: { error: 'AUTH_PIN_RESET_REQUIRED' },
    });
  });

  it('succeeds with correct bcrypt-hashed PIN', async () => {
    const pinHash = await bcrypt.hash('1234', 10);
    const userFind = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: false }),
    ]);
    const service = await buildService(userFind, jest.fn().mockResolvedValue(makeTerminal()));
    const result = await service.pinLogin('1234', 'T001');
    expect(result.access_token).toBe('token');
  });

  it('rejects when terminal is not found', async () => {
    const service = await buildService(
      jest.fn(),
      jest.fn().mockResolvedValue(null),
    );
    await expect(service.pinLogin('1234', 'MISSING')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

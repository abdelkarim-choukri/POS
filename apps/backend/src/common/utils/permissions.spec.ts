import { userHasPermission } from './permissions';

describe('userHasPermission [XCC-061]', () => {
  it('returns true for a native boolean true value', () => {
    expect(userHasPermission({ permissions: { can_void: true } }, 'can_void')).toBe(true);
  });

  it('returns false for a native boolean false value', () => {
    expect(userHasPermission({ permissions: { can_void: false } }, 'can_void')).toBe(false);
  });

  it('returns false for a missing key', () => {
    expect(userHasPermission({ permissions: {} }, 'can_void')).toBe(false);
  });

  it('returns false when permissions is undefined', () => {
    expect(userHasPermission({}, 'can_void')).toBe(false);
  });

  it('returns false when permissions is null', () => {
    expect(userHasPermission({ permissions: null }, 'can_void')).toBe(false);
  });

  it('returns true for string "true" (JWT serialisation safety)', () => {
    expect(userHasPermission({ permissions: { can_void: 'true' as any } }, 'can_void')).toBe(true);
  });

  it('returns false for string "false"', () => {
    expect(userHasPermission({ permissions: { can_void: 'false' as any } }, 'can_void')).toBe(false);
  });

  it('handles any canonical permission key (can_refund, can_adjust_points, etc.)', () => {
    const perms = { can_refund: true, can_adjust_points: true, can_void: false };
    expect(userHasPermission({ permissions: perms }, 'can_refund')).toBe(true);
    expect(userHasPermission({ permissions: perms }, 'can_adjust_points')).toBe(true);
    expect(userHasPermission({ permissions: perms }, 'can_void')).toBe(false);
  });
});

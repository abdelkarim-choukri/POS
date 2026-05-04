/**
 * Permission helper per [XCC-061].
 *
 * Reads a key from `user.permissions` (JSONB column).
 * TypeORM deserialises JSONB as a plain JS object, so values are native
 * booleans. The string variants ('true'/'false') are handled for safety
 * (e.g. when a value is passed through a JWT claim as serialised text).
 */
export function userHasPermission(
  user: { permissions?: Record<string, unknown> | null },
  key: string,
): boolean {
  const val = user.permissions?.[key];
  return val === true || val === 'true';
}

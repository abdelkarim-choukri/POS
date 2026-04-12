let counter = 0;
export function v4(): string {
  counter++;
  return `item-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
export function formatMAD(amount: number | string): string {
  return `${Number(amount).toFixed(2)} MAD`;
}

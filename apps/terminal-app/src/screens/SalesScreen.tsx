// apps/terminal-app/src/screens/SalesScreen.tsx
// ─── ONLY the ProductCard component needs to change ───────────────────────────
// Replace the existing ProductCard function at the bottom of SalesScreen.tsx
// with the one below. Everything else in the file stays the same.

function ProductCard({ product, onTap }: { product: Product; onTap: (p: Product) => void }) {
  const { addItem } = useCart();

  const handleTap = () => {
    const hasExtras =
      (product.variants && product.variants.length > 0) ||
      (product.product_modifier_groups && product.product_modifier_groups.length > 0);
    if (hasExtras) onTap(product);
    else addItem(product);
  };

  return (
    <button
      onClick={handleTap}
      className="bg-pos-accent rounded-xl text-left hover:bg-pos-accent/80 transition active:scale-[0.97] flex flex-col overflow-hidden"
    >
      {/* ── Image area ────────────────────────────────────────────────── */}
      {product.image_url ? (
        <div className="w-full aspect-square overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            // Gracefully fall back to no-image state if the URL is broken
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
            }}
          />
        </div>
      ) : (
        /* Coloured placeholder keeps card size consistent */
        <div className="w-full aspect-square bg-pos-card/60 flex items-center justify-center">
          <span className="text-2xl select-none opacity-40">🛒</span>
        </div>
      )}

      {/* ── Text area ─────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold line-clamp-2 mb-auto">{product.name}</p>
        {product.sku && <p className="text-[10px] text-gray-500 mt-1">{product.sku}</p>}
        <p className="text-pos-blue font-bold mt-2">{formatMAD(product.price)}</p>
      </div>
    </button>
  );
}
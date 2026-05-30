'use client';

import { useEffect, useState, useCallback } from 'react';

interface OssOrder {
  display_number: string;
  order_type: 'dine_in' | 'takeaway';
  item_count: number;
  started_at?: string;
  ready_at?: string;
}

interface OssData {
  preparing: OssOrder[];
  ready: OssOrder[];
}

function elapsedLabel(isoString?: string): string {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  return diff < 1 ? 'just now' : `${diff} min ago`;
}

function OrderCard({ order, isReady }: { order: OssOrder; isReady: boolean }) {
  const timestamp = isReady ? order.ready_at : order.started_at;
  return (
    <div
      className={`rounded-2xl border-2 p-6 flex flex-col gap-2 shadow-md ${
        isReady ? 'border-green-400 bg-green-950' : 'border-orange-400 bg-orange-950'
      }`}
    >
      <span className={`text-4xl font-bold tracking-tight ${isReady ? 'text-green-300' : 'text-orange-300'}`}>
        {order.display_number}
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          order.order_type === 'dine_in'
            ? 'bg-blue-800 text-blue-200'
            : 'bg-purple-800 text-purple-200'
        }`}>
          {order.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}
        </span>
        <span className="text-sm text-gray-400">
          {order.item_count} item{order.item_count !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="text-xs text-gray-500">
        {isReady ? 'ready' : 'preparing'} {elapsedLabel(timestamp)}
      </span>
    </div>
  );
}

export default function OssPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [data, setData] = useState<OssData>({ preparing: [], ready: [] });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLocationId(params.get('location_id'));
  }, []);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const url = new URL(`${base}/api/public/oss`);
      url.searchParams.set('location_id', locationId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json() as OssData;
      setData({
        preparing: Array.isArray(json?.preparing) ? json.preparing : [],
        ready: Array.isArray(json?.ready) ? json.ready : [],
      });
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!locationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl text-gray-400">
          Missing <code className="text-orange-400">?location_id=</code> in URL
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Order Status</h1>
        <span className="text-sm">
          {error ? (
            <span className="text-red-400">⚠ {error}</span>
          ) : lastUpdated ? (
            <span className="text-gray-400">Updated {lastUpdated}</span>
          ) : null}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-400 animate-pulse" />
            <h2 className="text-xl font-semibold text-orange-300">
              Preparing ({data.preparing.length})
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {data.preparing.length === 0 ? (
              <p className="text-gray-600 text-sm">No orders preparing</p>
            ) : (
              data.preparing.map((order) => (
                <OrderCard key={order.display_number} order={order} isReady={false} />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3.5 h-3.5 rounded-full bg-green-400" />
            <h2 className="text-xl font-semibold text-green-300">
              Ready ({data.ready.length})
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {data.ready.length === 0 ? (
              <p className="text-gray-600 text-sm">No orders ready</p>
            ) : (
              data.ready.map((order) => (
                <OrderCard key={order.display_number} order={order} isReady={true} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import { useMemo, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { LayoutGrid, ChevronDown, GripVertical, CheckCircle, Users, MapPin, Armchair } from "lucide-react"
import { tablesApi, diningAreasApi } from "@/lib/merchant/api"
import { merchantKeys } from "@/lib/merchant/query-keys"
import { humanizeError } from "@/lib/merchant/errors"
import type { BusinessTable } from "@/lib/merchant/types"

/**
 * Floor Plan Setup — TanStack Query migration.
 *
 * Ground truth (restaurant.controller tables + Table entity/DTO):
 *   - GET business/tables → { records: [...] }; each row NESTS `area` and
 *     `table_type` objects (the old UI read flat area_id/area_name/table_type_name →
 *     all undefined → it silently fell back to MOCK tables/areas).
 *   - position_x/position_y are INT (nullable). PATCH UpdateTableDto validates them
 *     with @IsInt, so the old fractional percentages (e.g. 35.5) → 400. Positions
 *     are rounded to integers before every PATCH.
 *   - The area filter now lists REAL dining areas (was a mock area list). "Remove
 *     from floor plan" now PERSISTS null positions (the old version only did it
 *     locally, so tables reappeared on reload).
 */

type Pos = { position_x: number | null; position_y: number | null }
const clampInt = (v: number) => Math.min(98, Math.max(2, Math.round(v)))

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "blue" | "gray" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-500",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>
}

export default function FloorPlanSetupPage() {
  const queryClient = useQueryClient()
  const [selectedArea, setSelectedArea] = useState("all")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  // Unsaved position edits keyed by table id (manual X/Y edits before "Save").
  const [overrides, setOverrides] = useState<Record<string, Pos>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | "error">>({})
  const [layoutError, setLayoutError] = useState<string | null>(null)

  const dragTableId = useRef<string | null>(null)
  const dragOffsetRef = useRef<{ ox: number; oy: number }>({ ox: 0, oy: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const tablesQuery = useQuery({ queryKey: merchantKeys.tables.list(), queryFn: () => tablesApi.list({ with_session_status: true }) })
  const areasQuery = useQuery({ queryKey: merchantKeys.diningAreas.list("active"), queryFn: () => diningAreasApi.list({ is_active: true }) })
  const tables = tablesQuery.data ?? []
  const areas = areasQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: merchantKeys.tables.all })

  // Effective position = unsaved override if present, else the server value.
  const effPos = (t: BusinessTable): Pos => overrides[t.id] ?? { position_x: t.position_x, position_y: t.position_y }
  const isPlaced = (t: BusinessTable) => { const p = effPos(t); return p.position_x !== null && p.position_y !== null }

  const positionMutation = useMutation({
    mutationFn: ({ id, pos }: { id: string; pos: Pos }) => tablesApi.update(id, pos),
    onMutate: ({ id }) => setSaveStatus((s) => ({ ...s, [id]: "saving" })),
    onSuccess: (_d, { id }) => {
      setOverrides((o) => { const n = { ...o }; delete n[id]; return n })
      setSaveStatus((s) => ({ ...s, [id]: "saved" }))
      setTimeout(() => setSaveStatus((s) => { const n = { ...s }; if (n[id] === "saved") delete n[id]; return n }), 2000)
      invalidate()
    },
    onError: (_e, { id }) => setSaveStatus((s) => ({ ...s, [id]: "error" })),
  })

  const dirtyIds = Object.keys(overrides)
  const saveLayout = async () => {
    setLayoutError(null)
    try {
      await Promise.all(dirtyIds.map((id) => tablesApi.update(id, overrides[id])))
      setOverrides({})
      invalidate()
    } catch (e) {
      setLayoutError(humanizeError(e, "Some positions could not be saved."))
    }
  }

  const filtered = useMemo(
    () => (selectedArea === "all" ? tables : tables.filter((t) => t.area?.id === selectedArea)),
    [tables, selectedArea],
  )
  const placed = filtered.filter(isPlaced)
  const unplaced = filtered.filter((t) => !isPlaced(t))
  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null

  const setLocalPos = (id: string, x: number | null, y: number | null) =>
    setOverrides((o) => ({ ...o, [id]: { position_x: x, position_y: y } }))

  const persist = (id: string, pos: Pos) => positionMutation.mutate({ id, pos })

  const removeFromFloorPlan = (id: string) => {
    setSelectedTableId(null)
    persist(id, { position_x: null, position_y: null })
  }

  const handleDragStart = (e: React.DragEvent<HTMLElement>, tableId: string) => {
    dragTableId.current = tableId
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffsetRef.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top }
    e.dataTransfer.effectAllowed = "move"
  }

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const tableId = dragTableId.current
    if (!tableId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const rawX = e.clientX - rect.left - dragOffsetRef.current.ox + 36
    const rawY = e.clientY - rect.top - dragOffsetRef.current.oy + 36
    const x = clampInt((rawX / rect.width) * 100)
    const y = clampInt((rawY / rect.height) * 100)
    setLocalPos(tableId, x, y)
    setSelectedTableId(tableId)
    persist(tableId, { position_x: x, position_y: y }) // auto-save (rounded INT)
    dragTableId.current = null
  }

  const bubbleStyles = (t: BusinessTable) =>
    t.session_status === "occupied" || t.session_status === "awaiting_payment"
      ? "bg-blue-50 border-blue-400 text-blue-800"
      : t.session_status === "available"
        ? "bg-green-50 border-green-300 text-green-800"
        : "bg-gray-100 border-gray-300 text-gray-600"

  const listError = tablesQuery.isError ? humanizeError(tablesQuery.error, "Failed to load tables.") : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Floor Plan Setup</h1>
            <p className="text-sm text-gray-500">Drag tables to position them on the floor plan</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirtyIds.length > 0 && (
            <button onClick={saveLayout} className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors">
              Save Layout ({dirtyIds.length})
            </button>
          )}
          {layoutError && <span className="text-xs text-red-500">{layoutError}</span>}
          <div className="relative">
            <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none">
              <option value="all">All Areas</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {listError && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{listError}</div>}

      <div className="flex gap-6">
        <div className="flex-1">
          <div ref={canvasRef} onDragOver={(e) => e.preventDefault()} onDrop={handleCanvasDrop}
            className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden"
            style={{ height: "520px", backgroundImage: `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`, backgroundSize: "40px 40px" }}>
            {tablesQuery.isLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"><span className="text-sm text-gray-400">Loading tables…</span></div>
            )}
            {selectedArea !== "all" && (
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">{areas.find((a) => a.id === selectedArea)?.name ?? ""}</span>
              </div>
            )}

            {placed.map((table) => {
              const p = effPos(table)
              return (
                <button key={table.id} draggable onClick={() => setSelectedTableId(table.id)} onDragStart={(e) => handleDragStart(e, table.id)}
                  className={`absolute w-[72px] h-[72px] rounded-2xl border-2 flex flex-col items-center justify-center cursor-move transition-all ${bubbleStyles(table)} ${selectedTableId === table.id ? "ring-2 ring-green-500 ring-offset-1" : ""}`}
                  style={{ left: `${p.position_x}%`, top: `${p.position_y}%`, transform: "translate(-50%, -50%)" }}>
                  <span className="font-mono font-bold text-sm">{table.table_number}</span>
                  <span className="text-xs">{table.capacity} seats</span>
                </button>
              )
            })}

            {!tablesQuery.isLoading && placed.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tables placed in this area</p>
                  <p className="text-gray-400 text-xs mt-1">Drag tables from the sidebar to position them</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-3">Drag tables to position them. In the terminal app, servers see this layout when selecting tables.</p>

          {selectedTable && (
            <div className="mt-4 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedTable.table_number}{selectedTable.area ? ` — ${selectedTable.area.name}` : ""}</h3>
                <div className="flex items-center gap-2">
                  {saveStatus[selectedTable.id] === "saving" && <span className="text-xs text-gray-400">Saving…</span>}
                  {saveStatus[selectedTable.id] === "saved" && <span className="text-xs text-green-600">Saved</span>}
                  {saveStatus[selectedTable.id] === "error" && <span className="text-xs text-red-500">Save failed</span>}
                  <Badge variant={selectedTable.is_active ? "green" : "gray"}>{selectedTable.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2"><Armchair className="w-4 h-4 text-gray-400" /><span>Type: {selectedTable.table_type?.name ?? "—"}</span></div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span>Capacity: {selectedTable.capacity} seats</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span>Area: {selectedTable.area?.name ?? "—"}</span></div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Position</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">X:</span>
                      <input type="number" min={0} max={100} value={effPos(selectedTable).position_x ?? 0}
                        onChange={(e) => setLocalPos(selectedTable.id, clampInt(Number(e.target.value)), effPos(selectedTable).position_y ?? 0)}
                        className="w-16 px-2 py-1.5 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Y:</span>
                      <input type="number" min={0} max={100} value={effPos(selectedTable).position_y ?? 0}
                        onChange={(e) => setLocalPos(selectedTable.id, effPos(selectedTable).position_x ?? 0, clampInt(Number(e.target.value)))}
                        className="w-16 px-2 py-1.5 border border-gray-200 dark:border-[#1F1F23] rounded-lg text-sm bg-white dark:bg-[#1a1a20] text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button onClick={() => removeFromFloorPlan(selectedTable.id)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Remove from Floor Plan</button>
                  <button disabled={saveStatus[selectedTable.id] === "saving"} onClick={() => persist(selectedTable.id, effPos(selectedTable))}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-60 transition-colors">
                    {saveStatus[selectedTable.id] === "saving" ? "Saving…" : "Save Position"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-56 bg-gray-50 dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-4 h-fit">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Unplaced Tables</h3>
          {unplaced.length > 0 ? (
            <div className="space-y-2">
              {unplaced.map((table) => (
                <div key={table.id} draggable onDragStart={(e) => handleDragStart(e, table.id)}
                  className="flex items-center gap-2 bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-[#1F1F23] rounded-lg px-3 py-2 cursor-move hover:border-gray-300 transition-colors">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{table.table_number}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-sm">All tables positioned</span></div>
          )}
        </div>
      </div>
    </div>
  )
}

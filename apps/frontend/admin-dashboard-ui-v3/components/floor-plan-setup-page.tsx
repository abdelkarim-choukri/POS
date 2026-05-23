"use client"

import { useState } from "react"
import {
  LayoutGrid,
  ChevronDown,
  GripVertical,
  CheckCircle,
  Users,
  MapPin,
  Armchair,
} from "lucide-react"

// Data Shapes
interface Table {
  id: string
  table_number: string
  capacity: number
  area_id: string
  area_name: string
  table_type_id: string
  table_type_name: string
  is_active: boolean
  position_x?: number
  position_y?: number
  session_status?: "available" | "occupied" | "awaiting_payment"
}

interface DiningArea {
  id: string
  name: string
}

// Mock Data
const DINING_AREAS: DiningArea[] = [
  { id: "all", name: "All Areas" },
  { id: "area-1", name: "Indoor Seating" },
  { id: "area-2", name: "Terrace" },
  { id: "area-3", name: "Bar" },
]

const TABLES: Table[] = [
  { id: "t-1", table_number: "T-01", capacity: 4, area_id: "area-1", area_name: "Indoor Seating", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 15, position_y: 20 },
  { id: "t-2", table_number: "T-02", capacity: 6, area_id: "area-1", area_name: "Indoor Seating", table_type_id: "type-2", table_type_name: "Booth", is_active: true, position_x: 35, position_y: 20 },
  { id: "t-3", table_number: "T-03", capacity: 4, area_id: "area-1", area_name: "Indoor Seating", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 55, position_y: 20 },
  { id: "t-4", table_number: "T-04", capacity: 4, area_id: "area-1", area_name: "Indoor Seating", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 15, position_y: 55 },
  { id: "t-5", table_number: "T-05", capacity: 6, area_id: "area-1", area_name: "Indoor Seating", table_type_id: "type-2", table_type_name: "Booth", is_active: true, position_x: 35, position_y: 55 },
  { id: "t-6", table_number: "T-06", capacity: 2, area_id: "area-2", area_name: "Terrace", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 70, position_y: 30 },
  { id: "t-7", table_number: "T-07", capacity: 4, area_id: "area-2", area_name: "Terrace", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 85, position_y: 30 },
  { id: "t-8", table_number: "T-08", capacity: 4, area_id: "area-2", area_name: "Terrace", table_type_id: "type-1", table_type_name: "Standard", is_active: true, position_x: 55, position_y: 75 },
  { id: "t-9", table_number: "B-01", capacity: 2, area_id: "area-3", area_name: "Bar", table_type_id: "type-3", table_type_name: "Bar Stool", is_active: true },
  { id: "t-10", table_number: "B-02", capacity: 2, area_id: "area-3", area_name: "Bar", table_type_id: "type-3", table_type_name: "Bar Stool", is_active: true },
  { id: "t-11", table_number: "B-03", capacity: 2, area_id: "area-3", area_name: "Bar", table_type_id: "type-3", table_type_name: "Bar Stool", is_active: true, position_x: 70, position_y: 70 },
  { id: "t-12", table_number: "B-04", capacity: 2, area_id: "area-3", area_name: "Bar", table_type_id: "type-3", table_type_name: "Bar Stool", is_active: true, position_x: 85, position_y: 70 },
]

// Badge Component
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "blue" | "gray" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-500",
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>{children}</span>
}

// Table Bubble Component
function TableBubble({
  table,
  isSelected,
  onClick,
}: {
  table: Table
  isSelected: boolean
  onClick: () => void
}) {
  // Determine color based on session status (for mockup, all are setup mode - gray)
  const getBubbleStyles = () => {
    if (table.session_status === "available") {
      return "bg-green-50 border-green-300 text-green-800"
    }
    if (table.session_status === "occupied") {
      return "bg-blue-50 border-blue-400 text-blue-800"
    }
    // Setup mode (no session data)
    return "bg-gray-100 border-gray-300 text-gray-600"
  }

  return (
    <button
      onClick={onClick}
      className={`absolute w-[72px] h-[72px] rounded-2xl border-2 flex flex-col items-center justify-center cursor-move transition-all ${getBubbleStyles()} ${
        isSelected ? "ring-2 ring-green-500 ring-offset-1" : ""
      }`}
      style={{
        left: `${table.position_x}%`,
        top: `${table.position_y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="font-mono font-bold text-sm">{table.table_number}</span>
      <span className="text-xs">{table.capacity} seats</span>
    </button>
  )
}

// Unplaced Table Chip Component
function UnplacedTableChip({ table }: { table: Table }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-move hover:border-gray-300 transition-colors">
      <GripVertical className="w-4 h-4 text-gray-400" />
      <span className="font-mono text-sm text-gray-700">{table.table_number}</span>
    </div>
  )
}

// Main Page Component
export default function FloorPlanSetupPage() {
  const [selectedArea, setSelectedArea] = useState("all")
  const [selectedTableId, setSelectedTableId] = useState<string | null>("t-3") // T-03 selected by default
  const [tables, setTables] = useState(TABLES)

  // Filter tables by area
  const filteredTables = selectedArea === "all" ? tables : tables.filter((t) => t.area_id === selectedArea)

  // Separate placed and unplaced tables
  const placedTables = filteredTables.filter((t) => t.position_x !== undefined && t.position_y !== undefined)
  const unplacedTables = filteredTables.filter((t) => t.position_x === undefined || t.position_y === undefined)

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  const updateTablePosition = (tableId: string, x: number, y: number) => {
    setTables(tables.map((t) => (t.id === tableId ? { ...t, position_x: x, position_y: y } : t)))
  }

  const removeFromFloorPlan = (tableId: string) => {
    setTables(tables.map((t) => (t.id === tableId ? { ...t, position_x: undefined, position_y: undefined } : t)))
    setSelectedTableId(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Floor Plan Setup</h1>
            <p className="text-sm text-gray-500">Drag tables to position them on the floor plan</p>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          >
            {DINING_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Canvas Area */}
        <div className="flex-1">
          <div
            className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden"
            style={{
              height: "520px",
              backgroundImage: `
                linear-gradient(to right, #f1f5f9 1px, transparent 1px),
                linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          >
            {/* Area Labels */}
            <div className="absolute top-4 left-4 flex gap-2">
              {selectedArea === "all" && (
                <>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Indoor</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Terrace</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">Bar</span>
                </>
              )}
              {selectedArea === "area-1" && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Indoor Seating</span>}
              {selectedArea === "area-2" && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">Terrace</span>}
              {selectedArea === "area-3" && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">Bar</span>}
            </div>

            {/* Table Bubbles */}
            {placedTables.map((table) => (
              <TableBubble
                key={table.id}
                table={table}
                isSelected={selectedTableId === table.id}
                onClick={() => setSelectedTableId(table.id)}
              />
            ))}

            {/* Empty State */}
            {placedTables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tables placed in this area</p>
                  <p className="text-gray-400 text-xs mt-1">Drag tables from the sidebar to position them</p>
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-500 mt-3">
            Drag tables to position them. In the actual terminal app, servers see this layout when selecting tables.
          </p>

          {/* Selected Table Panel */}
          {selectedTable && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {selectedTable.table_number} — {selectedTable.area_name}
                </h3>
                <Badge variant="green">Active</Badge>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Armchair className="w-4 h-4 text-gray-400" />
                  <span>Type: {selectedTable.table_type_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Capacity: {selectedTable.capacity} seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>Status: Active</span>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">X:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedTable.position_x ?? 0}
                        onChange={(e) => updateTablePosition(selectedTable.id, Number(e.target.value), selectedTable.position_y ?? 0)}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Y:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedTable.position_y ?? 0}
                        onChange={(e) => updateTablePosition(selectedTable.id, selectedTable.position_x ?? 0, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => removeFromFloorPlan(selectedTable.id)}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Remove from Floor Plan
                  </button>
                  <button className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">
                    Save Position
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unplaced Tables Sidebar */}
        <div className="w-56 bg-gray-50 border border-gray-200 rounded-xl p-4 h-fit">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Unplaced Tables</h3>

          {unplacedTables.length > 0 ? (
            <div className="space-y-2">
              {unplacedTables.map((table) => (
                <UnplacedTableChip key={table.id} table={table} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">All tables positioned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



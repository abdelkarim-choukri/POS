/**
 * Centralized text constants for RTL readiness
 * All text labels are externalized here for easy Arabic translation
 * When RTL is enabled, flip points include: slide panels (left↔right),
 * icon positions, and table column order
 */

// Currency formatting
export const CURRENCY = {
  code: "MAD",
  locale: "fr-MA",
  format: (amount: number) => `${amount.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
}

// Date formatting (French Moroccan format)
export const DATE_FORMAT = {
  date: "DD/MM/YYYY",
  datetime: "DD/MM/YYYY HH:mm",
  formatDate: (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  },
  formatDateTime: (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  },
}

// Pagination defaults
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
}

// Status badge color mapping
export const STATUS_COLORS: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
  // Green statuses
  active: "green",
  confirmed: "green",
  online: "green",
  posted: "green",
  delivered: "green",
  approved: "green",
  paid: "green",
  fulfilled: "green",
  
  // Blue statuses
  pending: "blue",
  draft: "blue",
  sent: "blue",
  in_progress: "blue",
  scheduled: "blue",
  processing: "blue",
  
  // Yellow/Amber statuses
  warning: "yellow",
  expires_soon: "yellow",
  partially_received: "yellow",
  partial: "yellow",
  stale: "yellow",
  
  // Red statuses
  error: "red",
  rejected: "red",
  voided: "red",
  expired: "red",
  offline: "red",
  cancelled: "red",
  failed: "red",
  
  // Gray statuses
  archived: "gray",
  inactive: "gray",
  synced: "gray",
  unknown: "gray",
}

// Get status color with fallback
export const getStatusColor = (status: string): "green" | "blue" | "yellow" | "red" | "gray" => {
  return STATUS_COLORS[status.toLowerCase()] || "gray"
}

// Common text labels - Recommendations Page
export const RECOMMENDATIONS_LABELS = {
  pageTitle: "Recommendations",
  pageSubtitle: "Configure product recommendation templates",
  newTemplate: "New Template",
  editTemplate: "Edit Template",
  deleteTemplate: "Delete Template",
  templateName: "Template Name",
  templateType: "Template Type",
  status: "Status",
  priority: "Priority",
  items: "Items",
  actions: "Actions",
  preview: "Preview",
  save: "Save",
  cancel: "Cancel",
  addItem: "Add Item",
  removeItem: "Remove Item",
  moveUp: "Move Up",
  moveDown: "Move Down",
  emptyState: {
    title: "No recommendation templates",
    description: "Create your first recommendation template to start suggesting products to customers.",
    cta: "Create Template",
  },
  types: {
    time_of_day: "Time of Day",
    customer_grade: "Customer Grade",
    manual: "Manual",
    seasonal: "Seasonal",
    top_seller: "Top Sellers",
    high_margin: "High Margin",
  },
  timeOfDay: {
    startTime: "Start Time",
    endTime: "End Time",
    days: "Active Days",
  },
  customerGrade: {
    targetGrade: "Target Grade",
  },
  immutableField: "This field cannot be changed after creation",
}

// Common text labels - Terminals Page
export const TERMINALS_LABELS = {
  pageTitle: "Terminals",
  pageSubtitle: "Monitor and manage POS terminals",
  allLocations: "All Locations",
  unassigned: "Unassigned",
  online: "Online",
  offline: "Offline",
  stale: "Stale",
  terminalId: "Terminal ID",
  location: "Location",
  status: "Status",
  lastSeen: "Last Seen",
  version: "Version",
  forceSync: "Force Sync",
  reassign: "Reassign",
  viewDetails: "View Details",
  lastUpdated: "Last updated",
  secondsAgo: "seconds ago",
  liveConnection: "Live connection active",
  emptyState: {
    title: "No terminals found",
    description: "No terminals are registered for this location. Register a new terminal to get started.",
    cta: "Register Terminal",
  },
  unassignedWarning: "These terminals need to be assigned to a location",
  permissions: {
    forceSync: "Manager or owner role required to force sync",
    reassign: "Manager or owner role required to reassign terminals",
  },
}

// Common text labels - Chain Page
export const CHAIN_LABELS = {
  pageTitle: "Chain Management",
  pageSubtitle: "Multi-store configuration and sync",
  promoteToParent: "Promote to Parent",
  standalone: "Standalone",
  child: "Child Store",
  parent: "Parent Store",
  myStores: "My Stores",
  syncConfig: "Sync Config",
  unmappedProducts: "Unmapped Products",
  dashboard: "Dashboard",
  transactions: "Transactions",
  poRequests: "PO Requests",
  parentInfo: "Parent Store Information",
  syncedCatalog: "Synced Catalog",
  localOverrides: "Local Overrides",
  switchBusiness: "Switch Business",
  sessionWarning: "Switching will end your current session",
  rolloutToChain: "Rollout to Chain",
  fulfillPO: "Fulfill PO",
  emptyState: {
    standalone: {
      title: "Single Store Mode",
      description: "You're operating as a standalone business. Promote to a parent store to manage multiple locations.",
      cta: "Promote to Parent",
    },
    stores: {
      title: "No child stores",
      description: "Add your first child store to start managing your chain.",
      cta: "Add Store",
    },
    unmapped: {
      title: "All products mapped",
      description: "Great! All parent products are mapped to local SKUs.",
    },
    poRequests: {
      title: "No PO requests",
      description: "Child stores haven't submitted any purchase order requests yet.",
    },
  },
  permissions: {
    promoteToParent: "Owner role required to promote to parent",
    rolloutToChain: "Only available for parent stores",
    fulfillPO: "Only available on parent chain businesses",
    chainSettings: "Chain settings only visible for non-standalone businesses",
  },
}

// Common text labels - Vendor Payments Page
export const VENDOR_PAYMENTS_LABELS = {
  pageTitle: "Vendor Payments",
  pageSubtitle: "Track and manage vendor payments",
  newPayment: "New Payment",
  confirmPayment: "Confirm Payment",
  voidPayment: "Void Payment",
  printReceipt: "Print Receipt",
  vendor: "Vendor",
  amount: "Amount",
  method: "Payment Method",
  status: "Status",
  date: "Date",
  reference: "Reference",
  linkedPO: "Linked PO",
  confirmedBy: "Confirmed By",
  confirmedAt: "Confirmed At",
  outstandingPOs: "Outstanding POs",
  selectVendor: "Select Vendor",
  selectPO: "Link to Purchase Order",
  methods: {
    cash: "Cash",
    check: "Check",
    bank_transfer: "Bank Transfer",
    mobile: "Mobile Payment",
  },
  financial: {
    ht: "HT",
    tva: "TVA",
    ttc: "TTC",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
  },
  emptyState: {
    title: "No payments recorded",
    description: "Record your first vendor payment to start tracking your accounts payable.",
    cta: "Record Payment",
  },
  permissions: {
    confirmPayment: "Manager or owner role required to confirm payments",
    voidPayment: "Manager or owner role required to void payments",
  },
}

// Common UI labels
export const COMMON_LABELS = {
  loading: "Loading...",
  saving: "Saving...",
  search: "Search",
  filter: "Filter",
  export: "Export",
  import: "Import",
  refresh: "Refresh",
  close: "Close",
  back: "Back",
  next: "Next",
  previous: "Previous",
  first: "First",
  last: "Last",
  showing: "Showing",
  of: "of",
  results: "results",
  page: "Page",
  perPage: "per page",
  noResults: "No results found",
  tryAgain: "Try again",
  error: "An error occurred",
  success: "Success",
  confirm: "Confirm",
  delete: "Delete",
  edit: "Edit",
  view: "View",
  create: "Create",
  update: "Update",
  selectAll: "Select All",
  deselectAll: "Deselect All",
  clearFilters: "Clear Filters",
  applyFilters: "Apply Filters",
}

// Permission labels
export const PERMISSION_LABELS = {
  insufficientPermissions: "Insufficient permissions",
  requiresManager: "Requires manager role",
  requiresOwner: "Requires owner role",
  requiresApproval: "Requires approval permission",
  contactAdmin: "Contact your administrator for access",
}

// RTL configuration
export const RTL_CONFIG = {
  enabled: false, // Set to true when Arabic is active
  direction: "ltr" as "ltr" | "rtl",
  // Flip points for RTL
  flipPoints: {
    slidePanel: "right", // Changes to "left" in RTL
    iconPosition: "left", // Changes to "right" in RTL
    tableColumns: false, // Reverse column order in RTL
  },
}

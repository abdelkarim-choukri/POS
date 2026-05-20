export interface WsFloorTableOpenedPayload {
  table_id: string;
  session_id: string;
  table_number: string;
}

export interface WsFloorTableClosedPayload {
  table_id: string;
  session_id: string;
  status: 'awaiting_payment' | 'cancelled' | 'paid';
}

export interface WsFloorSessionPaidPayload {
  table_id: string;
  session_id: string;
}

export interface WsFloorItemReadyPayload {
  item_id: string;
  session_id: string;
  table_number: string;
}

export interface WsKdsItemsAddedPayload {
  session_id: string;
  table_number: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    kds_status: string;
    notes: string | null;
  }>;
}

export interface WsKdsItemStatusChangedPayload {
  item_id: string;
  session_id: string;
  table_number: string;
  old_status: string;
  new_status: string;
}

export interface WsKdsItemCancelledPayload {
  item_id: string;
  session_id: string;
  table_number: string;
}

export interface WsKdsItemsTransferredPayload {
  item_ids: string[];
  source_session: string;
  target_session: string;
}

export interface WsDashboardTransactionCreatedPayload {
  transaction_id: string;
  total_ttc: number;
}

export interface WsInventoryExpirationAlertPayload {
  alert_id: string;
  batch_id: string;
  product_id: string;
  warehouse_id: string;
  severity: string;
}

export interface WsInventoryDiscrepancyAlertPayload {
  alert_id: string;
  batch_id: string | null;
  product_id: string | null;
  warehouse_id: string | null;
  source: string;
  discrepancy_quantity: number;
}

export interface WsOssOrderUpdatedPayload {
  location_id: string;
}

export type WsRoomName =
  | `floor:${string}`
  | `kds:${string}`
  | `dashboard:${string}`
  | `oss:${string}`;

export type WsEventName =
  | 'floor:table_opened'
  | 'floor:table_closed'
  | 'floor:session_paid'
  | 'floor:item_ready'
  | 'kds:items_added'
  | 'kds:item_status_changed'
  | 'kds:item_cancelled'
  | 'kds:items_transferred'
  | 'dashboard:transaction_created'
  | 'inventory:expiration_alert'
  | 'inventory:discrepancy_alert'
  | 'oss:order_updated';

"use client";

import Dexie, { type Table } from "dexie";

export type LocalLocation = {
  id: string;
  householdId: string;
  parentLocationId?: string | null;
  name: string;
  icon?: string | null;
  colorTint?: string | null;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "failed";
};

export type LocalItem = {
  id: string;
  householdId: string;
  locationId: string;
  name: string;
  notes?: string | null;
  quantity: number;
  useCount: number;
  lastUsedAt?: string | null;
  primaryPhotoBlob?: Blob | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "failed";
};

export type PendingSyncOperation = {
  id: string;
  operation: "insert" | "update" | "delete";
  tableName: "locations" | "items" | "item_photos" | "usage_events";
  payload: unknown;
  retryCount: number;
  createdAt: string;
};

class MyInventoryDexie extends Dexie {
  locations!: Table<LocalLocation, string>;
  items!: Table<LocalItem, string>;
  pendingSyncOperations!: Table<PendingSyncOperation, string>;

  constructor() {
    super("my_inventory_app");
    this.version(1).stores({
      locations: "id, householdId, parentLocationId, syncStatus, updatedAt",
      items: "id, householdId, locationId, syncStatus, updatedAt, createdAt",
      pendingSyncOperations: "id, tableName, createdAt",
    });
  }
}

export const db = new MyInventoryDexie();

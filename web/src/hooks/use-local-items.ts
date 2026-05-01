"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { db, type LocalItem } from "@/lib/dexie";

export function useLocalItems(locationId?: string) {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const collection = locationId
        ? db.items.where("locationId").equals(locationId)
        : db.items.orderBy("createdAt");
      const rows = await collection.reverse().toArray();
      return rows;
    }).subscribe({
      next(nextItems) {
        setItems(nextItems);
        setIsLoading(false);
      },
      error() {
        setItems([]);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [locationId]);

  return { items, isLoading };
}

export function useLocalItem(itemId: string) {
  const [item, setItem] = useState<LocalItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(() => db.items.get(itemId)).subscribe({
      next(nextItem) {
        setItem(nextItem ?? null);
        setIsLoading(false);
      },
      error() {
        setItem(null);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [itemId]);

  return { item, isLoading };
}

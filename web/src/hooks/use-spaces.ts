"use client";

import { useEffect, useState } from "react";
import type { Location } from "@/types/database";
import { getSpaces } from "@/features/spaces/queries";

export function useSpaces() {
  const [spaces, setSpaces] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getSpaces()
      .then((nextSpaces) => {
        if (active) {
          setSpaces(nextSpaces);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load spaces.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { spaces, isLoading, error };
}

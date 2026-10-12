"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { datasetsApi } from "@/lib/api/client";
import { Dataset } from "@/lib/api/types";

interface DatasetContextType {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType>({
  datasets: [],
  selectedDataset: null,
  selectedDatasetId: null,
  setSelectedDatasetId: () => {},
  loading: true,
  error: null,
  refreshDatasets: async () => {},
});

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await datasetsApi.list();
      setDatasets(list);

      // Resolve selected dataset ID priority:
      // 1. URL search param
      // 2. localStorage
      // 3. First dataset in list
      const urlDatasetId = searchParams.get("dataset_id");
      const storedDatasetId = typeof window !== "undefined"
        ? localStorage.getItem("insightflow_selected_dataset_id")
        : null;

      let targetId: string | null = null;
      if (urlDatasetId && list.some((d) => d.id === urlDatasetId)) {
        targetId = urlDatasetId;
      } else if (storedDatasetId && list.some((d) => d.id === storedDatasetId)) {
        targetId = storedDatasetId;
      } else if (list.length > 0) {
        targetId = list[0].id;
      }

      if (targetId) {
        setSelectedDatasetIdState(targetId);
        if (typeof window !== "undefined") {
          localStorage.setItem("insightflow_selected_dataset_id", targetId);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch datasets:", err);
      setError(err?.message || "Failed to load datasets from API");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const setSelectedDatasetId = useCallback(
    (newId: string) => {
      setSelectedDatasetIdState(newId);
      if (typeof window !== "undefined") {
        localStorage.setItem("insightflow_selected_dataset_id", newId);
      }
      // Update URL search param seamlessly without full page refresh
      const params = new URLSearchParams(searchParams.toString());
      params.set("dataset_id", newId);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId) || null;

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDataset,
        selectedDatasetId,
        setSelectedDatasetId,
        loading,
        error,
        refreshDatasets: fetchDatasets,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  return useContext(DatasetContext);
}

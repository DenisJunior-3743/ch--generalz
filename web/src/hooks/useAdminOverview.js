import { useCallback, useEffect, useState } from "react";
import { getAdminOverview } from "../api/adminOverview";

export function useAdminOverview({ enabled = true } = {}) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    data: null,
    message: "",
  });

  const refetch = useCallback(async () => {
    if (!enabled) {
      setState({ status: "idle", data: null, message: "" });
      return;
    }
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const data = await getAdminOverview();
      setState({ status: "loaded", data, message: "" });
    } catch (error) {
      setState({
        status: "error",
        data: null,
        message: error.detail || "Couldn't load the dashboard overview.",
      });
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

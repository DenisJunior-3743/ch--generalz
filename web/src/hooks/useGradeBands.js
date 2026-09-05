import { useCallback, useEffect, useState } from "react";
import { listGradeBands } from "../api/gradeBands";

export function useGradeBands() {
  const [state, setState] = useState({
    status: "loading",
    gradeBands: [],
    message: "",
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const gradeBands = await listGradeBands();
      const sorted = [...gradeBands].sort((a, b) => b.min_score - a.min_score);
      setState({ status: "loaded", gradeBands: sorted, message: "" });
    } catch (error) {
      setState({
        status: "error",
        gradeBands: [],
        message: error.detail || "Couldn't load grade bands.",
      });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

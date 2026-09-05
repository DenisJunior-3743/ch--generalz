import { useCallback, useEffect, useState } from "react";
import { listSemesters } from "../api/semesters";

export function useSemesters() {
  const [state, setState] = useState({
    status: "loading",
    semesters: [],
    message: "",
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const semesters = await listSemesters();
      const sorted = [...semesters].sort((a, b) => b.id - a.id);
      setState({ status: "loaded", semesters: sorted, message: "" });
    } catch (error) {
      setState({
        status: "error",
        semesters: [],
        message: error.detail || "Couldn't load semesters.",
      });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

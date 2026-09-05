import { useCallback, useEffect, useState } from "react";
import { listStudents } from "../api/students";

export function useStudents(page, pageSize = 10) {
  const [state, setState] = useState({
    status: "loading",
    items: [],
    total: 0,
    message: "",
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const data = await listStudents({ page, pageSize });
      setState({ status: "loaded", items: data.items, total: data.total, message: "" });
    } catch (error) {
      setState({
        status: "error",
        items: [],
        total: 0,
        message: error.detail || "Couldn't load students.",
      });
    }
  }, [page, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

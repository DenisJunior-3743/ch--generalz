import { useCallback, useEffect, useState } from "react";
import { listPrograms } from "../api/programs";

export function usePrograms(facultyId, { enabled = true } = {}) {
  const [state, setState] = useState({
    status: enabled ? "loading" : "idle",
    programs: [],
    message: "",
  });

  const refetch = useCallback(async () => {
    if (!enabled) {
      setState({ status: "idle", programs: [], message: "" });
      return;
    }
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const programs = await listPrograms(facultyId ? { facultyId } : {});
      setState({ status: "loaded", programs, message: "" });
    } catch (error) {
      setState({
        status: "error",
        programs: [],
        message: error.detail || "Couldn't load programs.",
      });
    }
  }, [facultyId, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

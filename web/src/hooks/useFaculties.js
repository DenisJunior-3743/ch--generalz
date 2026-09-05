import { useCallback, useEffect, useState } from "react";
import { listFaculties } from "../api/faculties";

export function useFaculties() {
  const [state, setState] = useState({
    status: "loading",
    faculties: [],
    message: "",
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const faculties = await listFaculties();
      setState({ status: "loaded", faculties, message: "" });
    } catch (error) {
      setState({
        status: "error",
        faculties: [],
        message: error.detail || "Couldn't load faculties.",
      });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

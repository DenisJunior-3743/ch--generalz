import { useCallback, useEffect, useState } from "react";
import { listCourses } from "../api/courses";

export function useCourses() {
  const [state, setState] = useState({
    status: "loading",
    courses: [],
    message: "",
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const courses = await listCourses();
      setState({ status: "loaded", courses, message: "" });
    } catch (error) {
      setState({
        status: "error",
        courses: [],
        message: error.detail || "Couldn't load courses.",
      });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyMarks } from "../api/marks";
import { useCourses } from "../hooks/useCourses";
import { useSemesters } from "../hooks/useSemesters";
import { formatSemester } from "../utils/format";

export default function MyMarksPage() {
  const [state, setState] = useState({ status: "loading", marks: [], message: "" });

  // A student's token may not have courses:read / semesters:read under the
  // seeded defaults — these just degrade to empty lookups if so, and the
  // table falls back to showing the raw id (see below).
  const { courses } = useCourses();
  const { semesters } = useSemesters();

  const courseLookup = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const semesterLookup = useMemo(() => new Map(semesters.map((s) => [s.id, s])), [semesters]);

  const fetchMarks = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const marks = await getMyMarks();
      setState({ status: "loaded", marks, message: "" });
    } catch (error) {
      setState({
        status: "error",
        marks: [],
        message: error.detail || "Couldn't load your marks.",
      });
    }
  }, []);

  useEffect(() => {
    fetchMarks();
  }, [fetchMarks]);

  return (
    <div>
      <div className="page-header">
        <h1>My Marks</h1>
        <p>Your own recorded grades — read-only.</p>
      </div>

      <div className="panel">
        {state.status === "loading" && <p className="list-state">Loading your marks…</p>}

        {state.status === "error" && (
          <div className="list-state list-state--error">
            <p>{state.message}</p>
            <button type="button" className="pagination-button" onClick={fetchMarks}>
              Retry
            </button>
          </div>
        )}

        {state.status === "loaded" && state.marks.length === 0 && (
          <p className="list-state">No marks recorded yet.</p>
        )}

        {state.status === "loaded" && state.marks.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Semester</th>
                  <th scope="col">Grade</th>
                </tr>
              </thead>
              <tbody>
                {state.marks.map((mark) => (
                  <tr key={mark.id}>
                    <td>
                      {courseLookup.get(mark.course_id)?.name ?? `Course #${mark.course_id}`}
                    </td>
                    <td>
                      {semesterLookup.has(mark.semester_id)
                        ? formatSemester(semesterLookup.get(mark.semester_id))
                        : `Semester #${mark.semester_id}`}
                    </td>
                    <td>{mark.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

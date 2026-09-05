import { useState } from "react";
import { useStudents } from "../hooks/useStudents";
import { formatRegNumber } from "../utils/format";
import Pagination from "./Pagination";

const PAGE_SIZE = 5;

export default function StudentPicker({ onSelect }) {
  const [page, setPage] = useState(1);
  const { status, items, total, message, refetch } = useStudents(page, PAGE_SIZE);

  return (
    <div>
      {status === "loading" && <p className="list-state">Loading students…</p>}

      {status === "error" && (
        <div className="list-state list-state--error">
          <p>{message}</p>
          <button type="button" className="pagination-button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {status === "loaded" && items.length === 0 && (
        <p className="list-state">No students registered yet.</p>
      )}

      {status === "loaded" && items.length > 0 && (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Reg number</th>
                  <th scope="col">Name</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((student) => (
                  <tr key={student.reg_number}>
                    <td>{formatRegNumber(student.reg_number)}</td>
                    <td>
                      {student.first_name} {student.last_name}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() => onSelect(student)}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

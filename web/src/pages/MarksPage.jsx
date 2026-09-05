import { useState } from "react";
import { useCourses } from "../hooks/useCourses";
import { useSemesters } from "../hooks/useSemesters";
import { formatRegNumber } from "../utils/format";
import StudentPicker from "../components/StudentPicker";
import StudentMarksTable from "../components/StudentMarksTable";

export default function MarksPage() {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { courses } = useCourses();
  const { semesters } = useSemesters();

  return (
    <div>
      <div className="page-header">
        <h1>Marks</h1>
        <p>Pick a student to view every mark recorded for them.</p>
      </div>

      {!selectedStudent && (
        <div className="panel">
          <h2>Select a student</h2>
          <StudentPicker onSelect={setSelectedStudent} />
        </div>
      )}

      {selectedStudent && (
        <div className="panel">
          <div className="selected-student-bar">
            <h2>
              {selectedStudent.first_name} {selectedStudent.last_name}{" "}
              <span className="selected-student-reg">
                ({formatRegNumber(selectedStudent.reg_number)})
              </span>
            </h2>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setSelectedStudent(null)}
            >
              Change student
            </button>
          </div>

          <StudentMarksTable
            regNumber={selectedStudent.reg_number}
            courses={courses}
            semesters={semesters}
          />
        </div>
      )}
    </div>
  );
}

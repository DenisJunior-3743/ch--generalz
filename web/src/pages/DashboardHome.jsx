import { useMemo } from "react";
import StatCard from "../components/StatCard";
import ChartCard from "../components/charts/ChartCard";
import BarChart from "../components/charts/BarChart";
import LineChart from "../components/charts/LineChart";
import StackedBarChart from "../components/charts/StackedBarChart";
import { useAdminOverview } from "../hooks/useAdminOverview";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import { formatSemester } from "../utils/format";
import {
  IconUsers,
  IconGraduationCap,
  IconBuilding,
  IconBook,
  IconClipboard,
} from "../components/icons";

const GENDER_META = {
  male: { label: "Male", color: "#2a78d6" },
  female: { label: "Female", color: "#eb6834" },
  other: { label: "Other", color: "#1baf7a" },
};

export default function DashboardHome() {
  const { user } = useAuth();
  const canViewOverview = hasPermission(user, "overview", "read");
  const { status, data, message, refetch } = useAdminOverview({ enabled: canViewOverview });

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Staff", value: data.staff.length, icon: IconUsers },
      { label: "Students", value: data.students.length, icon: IconGraduationCap },
      { label: "Faculties", value: data.faculties.length, icon: IconBuilding },
      { label: "Programs", value: data.programs.length, icon: IconBook },
      { label: "Marks recorded", value: data.marks.length, icon: IconClipboard },
    ];
  }, [data]);

  const facultyLookup = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.faculties.map((f) => [f.id, f]));
  }, [data]);

  const semesterLookup = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.semesters.map((s) => [s.id, s]));
  }, [data]);

  const studentsByFaculty = useMemo(() => {
    if (!data) return [];
    const counts = new Map();
    data.students.forEach((s) => {
      counts.set(s.faculty_id, (counts.get(s.faculty_id) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([facultyId, value]) => {
        const faculty = facultyLookup.get(facultyId);
        return {
          label: faculty?.code ?? `#${facultyId}`,
          fullName: faculty?.name ?? `Faculty #${facultyId}`,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, facultyLookup]);

  const genderSplit = useMemo(() => {
    if (!data) return [];
    const counts = { male: 0, female: 0, other: 0 };
    data.students.forEach((s) => {
      if (s.gender in counts) counts[s.gender] += 1;
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([gender, value]) => ({ ...GENDER_META[gender], value }));
  }, [data]);

  const genderTotal = genderSplit.reduce((sum, g) => sum + g.value, 0);

  const newStudentsByIntake = useMemo(() => {
    if (!data) return [];
    const counts = new Map();
    data.students.forEach((s) => {
      counts.set(s.intake_year, (counts.get(s.intake_year) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ label: String(year), value }));
  }, [data]);

  const marksBySemester = useMemo(() => {
    if (!data) return [];
    const counts = new Map();
    data.marks.forEach((m) => {
      counts.set(m.semester_id, (counts.get(m.semester_id) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([semesterId, value]) => {
        const semester = semesterLookup.get(semesterId);
        return { semester, semesterId, value };
      })
      .sort((a, b) => {
        const ka = a.semester ? `${a.semester.academic_year}-${a.semester.term}` : "";
        const kb = b.semester ? `${b.semester.academic_year}-${b.semester.term}` : "";
        return ka.localeCompare(kb);
      });
  }, [data, semesterLookup]);

  const displayName = user?.last_name || user?.username || "";

  if (!canViewOverview) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="mb-1 text-2xl text-foreground">Welcome, {displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to get to what you have access to.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl text-foreground">Welcome, {displayName}</h1>
        <p className="text-sm text-muted-foreground">Live data from GET /admin/overview.</p>
      </div>

      {status === "loading" && <p className="list-state">Loading dashboard…</p>}

      {status === "error" && (
        <div className="list-state list-state--error">
          <p>{message}</p>
          <button type="button" className="pagination-button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {status === "loaded" && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {data.students.length === 0 ? (
            <p className="list-state mt-5">
              No students registered yet — enrolment charts will appear here once
              registration begins.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
              <ChartCard
                title="Students by faculty"
                subtitle="Current enrolment across all faculties"
                columns={["Faculty", "Students"]}
                rows={studentsByFaculty.map((d) => [d.fullName, d.value])}
              >
                <BarChart
                  data={studentsByFaculty}
                  ariaLabel="Bar chart of students by faculty"
                />
              </ChartCard>

              <ChartCard
                title="Gender split"
                subtitle="Share of registered students"
                columns={["Gender", "Share"]}
                rows={genderSplit.map((d) => [
                  d.label,
                  `${((d.value / genderTotal) * 100).toFixed(0)}%`,
                ])}
              >
                <StackedBarChart
                  data={genderSplit}
                  ariaLabel="Stacked bar chart of gender distribution"
                />
              </ChartCard>

              <ChartCard
                title="New students by intake year"
                subtitle="Registrations per academic intake"
                columns={["Year", "New students"]}
                rows={newStudentsByIntake.map((d) => [d.label, d.value])}
              >
                <LineChart
                  data={newStudentsByIntake}
                  ariaLabel="Line chart of new students by intake year"
                />
              </ChartCard>

              {marksBySemester.length > 0 && (
                <ChartCard
                  title="Marks recorded by semester"
                  subtitle="Total mark entries per academic term"
                  columns={["Semester", "Marks recorded"]}
                  rows={marksBySemester.map((d) => [
                    d.semester ? formatSemester(d.semester) : `Semester #${d.semesterId}`,
                    d.value,
                  ])}
                >
                  <BarChart
                    data={marksBySemester.map((d) => ({
                      label: d.semester
                        ? `${d.semester.academic_year} ${d.semester.term === "sem_1" ? "S1" : "S2"}`
                        : `#${d.semesterId}`,
                      value: d.value,
                    }))}
                    ariaLabel="Bar chart of marks recorded by semester"
                  />
                </ChartCard>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import StatCard from "../components/StatCard";
import ChartCard from "../components/charts/ChartCard";
import BarChart from "../components/charts/BarChart";
import LineChart from "../components/charts/LineChart";
import { IconGraduationCap, IconClipboard, IconBook } from "../components/icons";

const DUMMY_STATS = [
  { label: "Overall average", value: "78.4%", icon: IconGraduationCap },
  { label: "Marks recorded", value: 12, icon: IconClipboard },
  { label: "Courses taken", value: 6, icon: IconBook },
];

const SCORE_BY_COURSE = [
  { label: "CS101", value: 82 },
  { label: "MAT201", value: 75 },
  { label: "PHY150", value: 69 },
  { label: "CS210", value: 88 },
  { label: "ENG100", value: 91 },
  { label: "CS305", value: 74 },
];

const SCORE_TREND = [
  { label: "Y1 S1", value: 70 },
  { label: "Y1 S2", value: 74 },
  { label: "Y2 S1", value: 78 },
  { label: "Y2 S2", value: 81 },
  { label: "Y3 S1", value: 79 },
];

const GRADE_DISTRIBUTION = [
  { label: "F (<50)", value: 1, color: "#86b6ef" },
  { label: "D (50-59)", value: 2, color: "#5598e7" },
  { label: "C (60-69)", value: 3, color: "#2a78d6" },
  { label: "B (70-79)", value: 4, color: "#1c5cab" },
  { label: "A (80-100)", value: 2, color: "#104281" },
];

export default function StudentOverviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl text-foreground">My Overview</h1>
        <p className="text-sm text-muted-foreground">
          Dummy data for now — this will connect to the real API in later phases.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {DUMMY_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <ChartCard
          title="Score by course"
          subtitle="Most recent recorded score per course"
          columns={["Course", "Score"]}
          rows={SCORE_BY_COURSE.map((d) => [d.label, d.value])}
        >
          <BarChart
            data={SCORE_BY_COURSE}
            ariaLabel="Bar chart of score by course"
          />
        </ChartCard>

        <ChartCard
          title="Average score trend"
          subtitle="By semester, across your studies so far"
          columns={["Semester", "Average score"]}
          rows={SCORE_TREND.map((d) => [d.label, d.value])}
        >
          <LineChart
            data={SCORE_TREND}
            ariaLabel="Line chart of average score trend by semester"
          />
        </ChartCard>

        <ChartCard
          title="Grade distribution"
          subtitle="Number of courses per grade band"
          columns={["Grade band", "Courses"]}
          rows={GRADE_DISTRIBUTION.map((d) => [d.label, d.value])}
        >
          <BarChart
            data={GRADE_DISTRIBUTION}
            ariaLabel="Bar chart of grade distribution"
          />
        </ChartCard>
      </div>
    </div>
  );
}

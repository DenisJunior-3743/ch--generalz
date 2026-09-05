import { Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequirePermission from "./auth/RequirePermission";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardHome from "./pages/DashboardHome";
import StaffPage from "./pages/StaffPage";
import StudentsPage from "./pages/StudentsPage";
import StudentRegistrationPage from "./pages/StudentRegistrationPage";
import FacultiesPage from "./pages/FacultiesPage";
import ProgramsPage from "./pages/ProgramsPage";
import CoursesPage from "./pages/CoursesPage";
import SemestersPage from "./pages/SemestersPage";
import GradeBandsPage from "./pages/GradeBandsPage";
import MarksPage from "./pages/MarksPage";
import MarksEntryPage from "./pages/MarksEntryPage";
import MyMarksPage from "./pages/MyMarksPage";
import StudentOverviewPage from "./pages/StudentOverviewPage";
import UsersPage from "./pages/UsersPage";
import RolePermissionsPage from "./pages/RolePermissionsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />

          <Route
            path="staff"
            element={
              <RequirePermission module="staff" action="read">
                <StaffPage />
              </RequirePermission>
            }
          />
          <Route
            path="students"
            element={
              <RequirePermission module="students" action="read">
                <StudentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="students/register"
            element={
              <RequirePermission module="students" action="create">
                <StudentRegistrationPage />
              </RequirePermission>
            }
          />
          <Route
            path="faculties"
            element={
              <RequirePermission module="faculties" action="read">
                <FacultiesPage />
              </RequirePermission>
            }
          />
          <Route
            path="programs"
            element={
              <RequirePermission module="programs" action="read">
                <ProgramsPage />
              </RequirePermission>
            }
          />
          <Route
            path="courses"
            element={
              <RequirePermission module="courses" action="read">
                <CoursesPage />
              </RequirePermission>
            }
          />
          <Route
            path="semesters"
            element={
              <RequirePermission module="semesters" action="read">
                <SemestersPage />
              </RequirePermission>
            }
          />
          <Route
            path="grade-bands"
            element={
              <RequirePermission module="grade_bands" action="read">
                <GradeBandsPage />
              </RequirePermission>
            }
          />
          <Route
            path="marks"
            element={
              <RequirePermission module="marks" action="read">
                <MarksPage />
              </RequirePermission>
            }
          />
          <Route
            path="marks/entry"
            element={
              <RequirePermission module="marks" action="create">
                <MarksEntryPage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission module="users" action="read">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="permissions"
            element={
              <RequirePermission module="permissions" action="read">
                <RolePermissionsPage />
              </RequirePermission>
            }
          />

          <Route path="my-overview" element={<StudentOverviewPage />} />
          <Route path="my-marks" element={<MyMarksPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import StudentProfile from '../pages/student/StudentProfile';
import TrajectorySelection from '../pages/student/TrajectorySelection';
import StudentRecords from '../pages/student/StudentRecords';
import StudentSettings from '../pages/student/StudentSettings';
import NotFoundPage from '../pages/error/NotFoundPage';
import CourseManagement from '../pages/admin/CourseManagement';
import AdminSettings from '../pages/admin/AdminSettings';

import StudentLayout from '../pages/layouts/StudentLayout';
import StudentManagement from '../pages/admin/StudentManagement';
import AdminManagement from '../pages/admin/AdminManagement';
import TrajectoryReview from '../pages/admin/TrajectoryReview';
import GradeManagement from '../pages/admin/GradeManagement';
import AdminLayout from '../pages/layouts/AdminLayout';

const AppRouter = () => {
  const { isAuthenticated, user, isCheckingAuth } = useSelector((state: RootState) => state.auth);

  if (isCheckingAuth) {
    return (
      <Center h="100vh">
        <Loader color="brand" size="xl" type="bars" />
      </Center>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to={user?.role === 'ADMIN' ? '/admin/students' : '/student'} />}
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {isAuthenticated && user?.role === 'STUDENT' && (
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentProfile />} />
          <Route path="trajectory" element={<TrajectorySelection />} />
          <Route path="records" element={<StudentRecords />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>
      )}

      {isAuthenticated && user?.role === 'ADMIN' && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="students" replace />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="admins" element={<AdminManagement />} />
          <Route path="approval" element={<TrajectoryReview />} />
          <Route path="grades" element={<GradeManagement />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      )}

      {/* Global 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;

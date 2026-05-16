import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

import StudentLayout from '../pages/layouts/StudentLayout';
import AdminLayout from '../pages/layouts/AdminLayout';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));
const TrajectorySelection = lazy(() => import('../pages/student/TrajectorySelection'));
const StudentRecords = lazy(() => import('../pages/student/StudentRecords'));
const StudentSettings = lazy(() => import('../pages/student/StudentSettings'));
const NotFoundPage = lazy(() => import('../pages/error/NotFoundPage'));
const CourseManagement = lazy(() => import('../pages/admin/CourseManagement'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const StudentManagement = lazy(() => import('../pages/admin/StudentManagement'));
const AdminManagement = lazy(() => import('../pages/admin/AdminManagement'));
const TrajectoryReview = lazy(() => import('../pages/admin/TrajectoryReview'));
const GradeManagement = lazy(() => import('../pages/admin/GradeManagement'));

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
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader color="brand" size="xl" type="bars" />
        </Center>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;

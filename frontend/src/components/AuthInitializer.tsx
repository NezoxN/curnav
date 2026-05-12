import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setUser, setCheckingAuth, logout } from '../store/authSlice';
import apiClient from '../api/apiClient';

interface AuthInitializerProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token && !user) {
        try {
          const response = await apiClient.get('/auth/me');
          if (response.data.status === 'success') {
            dispatch(setUser(response.data.data.user));
          } else {
            dispatch(logout());
          }
        } catch (error: any) {
          console.error('Auth initialization failed:', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            dispatch(logout());
          } else {
            dispatch(setCheckingAuth(false));
          }
        }
      } else {
        dispatch(setCheckingAuth(false));
      }
    };

    initializeAuth();
  }, [dispatch, token, user]);

  return <>{children}</>;
};

export default AuthInitializer;

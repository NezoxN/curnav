import React from 'react';
import { Paper, Stack, Text, Button, Title, ThemeIcon, Group } from '@mantine/core';
import { IconShieldLock, IconLogout, IconMailForward } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';


const StudentSettings: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handlePasswordReset = async () => {
    try {
      const meRes = await apiClient.get('/auth/me');
      await apiClient.post('/auth/reset-password', { email: meRes.data.data.user.email });
      notifications.show({ title: 'Успіх', message: 'На вашу пошту відправлено лист для скидання пароля', color: 'teal', autoClose: 10000 });
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося відправити запит', color: 'red' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
      dispatch(logout());
      navigate('/login');
      notifications.show({ title: 'Успіх', message: 'Ви успішно вийшли з акаунта', color: 'teal', autoClose: 3000 });
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося вийти з акаунта', color: 'red' });
    }
  };

  return (
    <div className="fade-in">
      <Paper className="premium-card" p="xl">
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue" size="lg" radius="md">
              <IconShieldLock size={20} />
            </ThemeIcon>
            <Title order={3}>Безпека та Акаунт</Title>
          </Group>
          <Text c="dimmed" size="sm" mb="md">
            Керуйте доступом до вашого профілю та безпекою даних.
          </Text>

          <Stack gap="sm">
            <Button
              variant="light"
              color="brand"
              fullWidth
              h={50}
              leftSection={<IconMailForward size={18} />}
              onClick={handlePasswordReset}
            >
              Скинути пароль через пошту
            </Button>

            <Button
              variant="subtle"
              color="red"
              fullWidth
              h={50}
              leftSection={<IconLogout size={18} />}
              onClick={handleLogout}
            >
              Вийти з системи
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </div>
  );
};

export default StudentSettings;

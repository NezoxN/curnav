import React, { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Text, Anchor, Group, Center, ActionIcon, useMantineColorScheme, Stack } from '@mantine/core';
import { IconSun, IconMoon, IconAt, IconLock } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { notifications } from '@mantine/notifications';

import apiClient from '@/api/apiClient';
import { setCredentials } from '@/store/authSlice';
import Logo from '@/components/Logo';

import { zodResolver, loginSchema } from '@/utils/validation';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const form = useForm({
    validateInputOnChange: true,
    initialValues: {
      email: '',
      password: '',
    },

    validate: zodResolver(loginSchema),
  });

  const handleLogin = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', values);
      const { user, accessToken: token } = response.data.data;
      dispatch(setCredentials({ user, token }));

      notifications.show({
        title: 'Успішна авторизація',
        message: `Вітаємо в системі CurriNav!`,
        color: 'teal',
      });

      if (user.role === 'ADMIN') {
        navigate('/admin/students');
      } else {
        navigate('/student');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Помилка авторизації',
        message: error.response?.data?.message || 'Перевірте введені дані',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'light-dark(#f8f9fa, var(--mantine-color-dark-8))' }}>
      <ActionIcon 
        onClick={() => toggleColorScheme()} 
        variant="default" 
        size="xl" 
        radius="md" 
        style={{ position: 'absolute', top: 20, right: 20 }}
      >
        {colorScheme === 'dark' ? <IconSun size={24} /> : <IconMoon size={24} />}
      </ActionIcon>
      
      <Container size={420} w="100%">
        <div className="fade-in">
          <Center mb="md">
            <Logo size={80} />
          </Center>
          <Title ta="center" fw={800} c="light-dark(brand.8, brand.4)" mb="xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
            CurriNav
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb="lg">
            Національний технічний університет «ХПІ»
          </Text>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md" bg="light-dark(white, var(--mantine-color-dark-7))">
            <Title order={3} ta="center" mb="md" fw={700}>Вхід до системи</Title>
            <Text size="sm" c="dimmed" ta="center" mb="xl">
              Використовуйте свої облікові дані для доступу
            </Text>

            <form onSubmit={form.onSubmit(handleLogin)}>
              <Stack gap="md">
                <TextInput
                  label="Електронна пошта"
                  placeholder={`user@kpi.kharkov.ua`}
                  required
                  leftSection={<IconAt size={18} stroke={1.5} />}
                  radius="md"
                  {...form.getInputProps('email')}
                />
                <PasswordInput
                  label="Пароль"
                  placeholder="Ваш пароль"
                  required
                  leftSection={<IconLock size={18} stroke={1.5} />}
                  radius="md"
                  {...form.getInputProps('password')}
                />
              </Stack>
              <Group justify="space-between" mt="lg">
                <Anchor component="button" type="button" size="sm" onClick={() => navigate('/forgot-password')}>
                  Забули пароль?
                </Anchor>
              </Group>
              <Button fullWidth mt="xl" type="submit" loading={loading} color="brand" radius="md" size="md">
                Увійти
              </Button>
            </form>
          </Paper>
        </div>
      </Container>
    </div>
  );
};

export default LoginPage;

import React, { useState, useEffect } from 'react';
import { Button, Paper, Title, Container, Text, PasswordInput, Center, ActionIcon, useMantineColorScheme, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconSun, IconMoon, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';
import Logo from '../../components/Logo';
import { zodResolver, resetPasswordSchema } from '@/utils/validation';

const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      notifications.show({ title: 'Помилка', message: 'Недійсне посилання для відновлення', color: 'red' });
      navigate('/login');
    }
  }, [token, navigate]);

  const form = useForm({
    validateInputOnChange: true,
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: zodResolver(resetPasswordSchema),
  });

  const handleReset = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password/confirm', {
        token,
        newPassword: values.newPassword,
      });

      notifications.show({
        title: 'Успіх',
        message: 'Пароль успішно змінено. Тепер ви можете увійти.',
        color: 'teal',
      });
      navigate('/login');
    } catch (error: any) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.message || 'Помилка скидання пароля',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

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
            <Title order={3} ta="center" mb="md" fw={700}>Новий пароль</Title>
            <Text size="sm" c="dimmed" ta="center" mb="xl">
              Встановіть новий надійний пароль для вашого акаунту
            </Text>

            <form onSubmit={form.onSubmit(handleReset)}>
              <Stack gap="md">
                <PasswordInput
                  label="Новий пароль"
                  placeholder="Мінімум 8 символів"
                  required
                  leftSection={<IconLock size={18} stroke={1.5} />}
                  radius="md"
                  {...form.getInputProps('newPassword')}
                />
                <PasswordInput
                  label="Підтвердіть пароль"
                  placeholder="Повторіть пароль"
                  required
                  leftSection={<IconLock size={18} stroke={1.5} />}
                  radius="md"
                  {...form.getInputProps('confirmPassword')}
                />
              </Stack>
              <Button fullWidth mt="xl" type="submit" loading={loading} color="brand" radius="md" size="md">
                Зберегти пароль
              </Button>
            </form>
          </Paper>
        </div>
      </Container>
    </div>
  );
};

export default ResetPasswordPage;

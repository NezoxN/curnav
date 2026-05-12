import { TextInput, Button, Paper, Title, Container, Text, Anchor, Group, Center, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSun, IconMoon, IconAt, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';
import Logo from '../../components/Logo';
import { validators } from '@/utils/validation';

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const form = useForm({
    validateInputOnChange: true,
    initialValues: {
      email: '',
    },

    validate: {
      email: validators.email,
    },
  });

  const handleReset = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/reset-password', values);
      notifications.show({
        title: 'Успіх',
        message: response.data.data.message || 'Інструкції відправлено на вашу пошту',
        color: 'teal',
        autoClose: 10000,
      });
      navigate('/login');
    } catch (error: any) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.message || 'Користувача не знайдено',
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
            <Title order={3} ta="center" mb="md" fw={700}>Відновлення пароля</Title>
            <Text size="sm" c="dimmed" ta="center" mb="xl">
              Введіть email вашого акаунту для отримання інструкцій
            </Text>

            <form onSubmit={form.onSubmit(handleReset)}>
              <TextInput
                label="Електронна пошта"
                placeholder="user@kpi.kharkov.ua"
                required
                leftSection={<IconAt size={18} stroke={1.5} />}
                radius="md"
                {...form.getInputProps('email')}
              />
              <Button fullWidth mt="xl" type="submit" loading={loading} color="brand" radius="md" size="md">
                Скинути пароль
              </Button>
              
              <Group justify="center" mt="md">
                <Anchor component="button" type="button" size="sm" onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconArrowLeft size={14} /> Повернутися до входу
                </Anchor>
              </Group>
            </form>
          </Paper>
        </div>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;

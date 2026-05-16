import React, { useEffect, useState } from 'react';
import { Paper, Stack, Button, Group, Text, Box, Switch, ThemeIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy, IconClock, IconLock, IconLockOpen } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import apiClient from '@/api/apiClient';

const AdminSettings: React.FC = () => {
  const [globalLoading, setGlobalLoading] = useState(false);

  const globalForm = useForm({
    initialValues: {
      isSelectionOpen: false
    }
  });

  const fetchSettings = async () => {
    try {
      const globalRes = await apiClient.get('/admin/global-settings');

      globalForm.setValues({
        isSelectionOpen: globalRes.data.data.isSelectionOpen
      });
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити налаштування', color: 'red' });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);



  const handleSaveGlobal = async (values: typeof globalForm.values) => {
    setGlobalLoading(true);
    try {
      await apiClient.put('/admin/global-settings', values);
      notifications.show({ title: 'Успішно', message: 'Академічні налаштування збережено', color: 'teal' });
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Помилка при збереженні', color: 'red' });
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Box>
          <Text size="xl" fw={800} className="premium-text-gradient">Академічні налаштування</Text>
          <Text size="xs" c="dimmed">Конфігурація академічних параметрів системи</Text>
        </Box>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '24px' }}>
          <Stack gap="xl">
            <Paper p="xl" radius="md" withBorder>
              <form onSubmit={globalForm.onSubmit(handleSaveGlobal)}>
                <Stack gap="xl">
                  <Group mb="xs" align="center">
                    <ThemeIcon variant="light" color="brand" radius="md">
                      <IconClock size={20} />
                    </ThemeIcon>
                    <Text fw={600}>Академічний період</Text>
                  </Group>

                  <Paper p="md" radius="md" withBorder style={{ borderStyle: 'dashed' }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Box>
                        <Text fw={700}>Вибір індивідуальної траєкторії</Text>
                        <Text size="xs" c="dimmed">Якщо вимкнено, студенти не зможуть змінювати свій вибір курсів</Text>
                      </Box>
                      <Switch
                        size="lg"
                        onLabel={<IconLockOpen size={16} stroke={2.5} />}
                        offLabel={<IconLock size={16} stroke={2.5} />}
                        {...globalForm.getInputProps('isSelectionOpen', { type: 'checkbox' })}
                      />
                    </Group>
                  </Paper>

                  <Group justify="flex-end" mt="xl">
                    <Button
                      type="submit"
                      size="md"
                      radius="md"
                      loading={globalLoading}
                      leftSection={<IconDeviceFloppy size={18} />}
                      color="brand"
                    >
                      Зберегти налаштування періоду
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Stack>
        </div>
      </Stack>
    </>
  );
};

export default AdminSettings;

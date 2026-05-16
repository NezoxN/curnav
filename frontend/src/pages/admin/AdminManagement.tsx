import React, { useEffect, useState } from 'react';
import { Paper, Table, Button, Group, ActionIcon, Modal, TextInput, Stack, Badge, Text, ScrollArea, Box, Center, ThemeIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconSearch, IconShieldLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface User {
  id: string;
  email: string;
  role: string;
  isBlocked: boolean;
}

import { zodResolver, adminSchema } from '@/utils/validation';

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const form = useForm({
    validateInputOnChange: true,
    initialValues: {
      email: '',
      fullName: '',
      role: 'ADMIN'
    },
    validate: zodResolver(adminSchema),
  });

  const fetchAdmins = async () => {
    try {
      const res = await apiClient.get('/admin/admins', {
        params: { search }
      });
      setAdmins(res.data.data.admins);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити адміністраторів', color: 'red' });
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [search]);

  const handleSave = async (values: typeof form.values) => {
    try {
      await apiClient.post('/admin/students', values);
      notifications.show({ title: 'Успіх', message: 'Адміністратора створено', color: 'teal' });
      close();
      fetchAdmins();
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося створити адміністратора', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      notifications.show({ title: 'Помилка', message: 'Ви не можете видалити власний акаунт', color: 'red' });
      return;
    }
    if (!window.confirm('Ви впевнені, що хочете видалити цей акаунт?')) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      notifications.show({ title: 'Успіх', message: 'Адміністратора видалено', color: 'teal' });
      fetchAdmins();
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося видалити користувача', color: 'red' });
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Box>
          <Text size="xl" fw={800} className="premium-text-gradient">Адміністратори системи</Text>
          <Text size="xs" c="dimmed">Керування правами доступу та обліковими записами персоналу</Text>
        </Box>
        <Group justify="space-between" wrap="wrap">
          <TextInput
            placeholder="Пошук адміністратора..."
            size="md"
            radius="md"
            leftSection={<IconSearch size={18} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Button size="md" leftSection={<IconPlus size={18} />} onClick={() => { form.reset(); open(); }} color="brand" radius="md">
            Додати адміна
          </Button>
        </Group>

        <Paper p={0} withBorder radius="md" style={{ overflow: 'hidden' }}>
          <ScrollArea h={600}>
            <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
              <Table.Thead bg="light-dark(gray.0, dark.6)">
                <Table.Tr>
                  <Table.Th>Адміністратор</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th style={{ width: '120px' }}>Дії</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {admins.map((admin) => (
                  <Table.Tr key={admin.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon variant="light" color="brand" radius="md">
                          <IconShieldLock size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700} size="sm">{admin.email}</Text>
                          <Text size="xs" c="dimmed">Системний адміністратор</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {admin.isBlocked ? (
                        <Badge color="red" variant="light" size="xs">Заблоковано</Badge>
                      ) : (
                        <Badge color="brand" variant="light" size="xs">Активний</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap" justify="flex-end">
                        <ActionIcon
                          onClick={() => handleDelete(admin.id)}
                          variant="subtle"
                          color="red"
                          radius="md"
                          disabled={admin.id === currentUser?.id}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {admins.length === 0 && (
              <Center h={300}>
                <Stack align="center" gap="xs">
                  <IconSearch size={32} color="gray" />
                  <Text c="dimmed">Нікого не знайдено</Text>
                </Stack>
              </Center>
            )}
          </ScrollArea>
        </Paper>

        <Modal opened={opened} onClose={close} title="Новий адміністратор" centered radius="md">
          <form onSubmit={form.onSubmit(handleSave)}>
            <Stack gap="md">
              <TextInput label="Email" placeholder="admin@example.com" required radius="md" {...form.getInputProps('email')} />
              <TextInput label="ПІБ / Назва" placeholder="Імʼя адміністратора" required radius="md" {...form.getInputProps('fullName')} />
              <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={close} radius="md">Скасувати</Button>
                <Button color="brand" type="submit" radius="md">Створити</Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Stack>
    </>
  );
};

export default AdminManagement;

import React, { useEffect, useState } from 'react';
import { Paper, Table, Button, Group, ActionIcon, Modal, TextInput, Select, Stack, Badge, FileInput, Text, ScrollArea, Box, Grid, Collapse, Avatar, UnstyledButton, SimpleGrid, ThemeIcon, Pagination, Tabs, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { EDUCATION_FORMS, joiResolver, studentSchema, groupSchema } from '@/utils/validation';
import { IconPlus, IconEdit, IconTrash, IconUpload, IconChevronDown, IconChevronUp, IconLock, IconLockOpen, IconFilter, IconSearch, IconArrowLeft, IconUsers, IconHierarchy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';

interface Student {
  id: string;
  userId: string;
  fullName: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    currentSemester: number;
    educationalProgramId: string;
    educationalProgram: {
      id: string;
      name: string;
    };
  };
  educationForm: string;
  user: {
    email: string;
    isBlocked: boolean;
    role: string;
  };
}

interface ImportResults {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [groupImportOpened, { open: openGroupImport, close: closeGroupImport }] = useDisclosure(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [groupImportResults, setGroupImportResults] = useState<ImportResults | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [educationalPrograms, setEducationalPrograms] = useState<any[]>([]);

  const [openedFilters, { toggle: toggleFilters }] = useDisclosure(false);
  const [filterProgram, setFilterProgram] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string | null>('students');
  const [groupOpened, { open: openGroup, close: closeGroup }] = useDisclosure(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);


  const groupForm = useForm({
    validateInputOnChange: true,
    initialValues: { name: '', description: '', educationalProgramId: '', currentSemester: 1 },
    validate: joiResolver(groupSchema),
  });

  const form = useForm({
    validateInputOnChange: true,
    initialValues: {
      role: 'STUDENT',
      email: '',
      fullName: '',
      groupId: '',
      educationForm: 'FULL_TIME',
    },
    validate: joiResolver(studentSchema),
  });

  const fetchStudents = async (page = 1) => {
    try {
      const res = await apiClient.get('/admin/students', {
        params: {
          search,
          groupId: (filterGroup && filterGroup !== 'ALL_STUDENTS') ? filterGroup : undefined,
          year: filterYear || undefined,
          educationalProgramId: filterProgram || undefined,
          isBlocked: filterStatus === 'blocked' ? true : filterStatus === 'active' ? false : undefined,
          page,
          limit: 100
        }
      });
      setStudents(res.data.data.students);
      setPagination(res.data.data.pagination);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити студентів', color: 'red' });
    }
  };

  const fetchGroups = async () => {
    try {
      const [groupsRes, specsRes] = await Promise.all([
        apiClient.get('/admin/groups'),
        apiClient.get('/admin/educational-programs')
      ]);
      setGroups(groupsRes.data.data);
      setEducationalPrograms(specsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [search, filterGroup, filterYear, filterStatus, filterProgram]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const activeFiltersCount = [filterGroup, filterYear, filterStatus, filterProgram, search].filter(Boolean).length;

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    let edForm = student.educationForm || 'FULL_TIME';
    if (edForm === 'Денна') edForm = 'FULL_TIME';
    if (edForm === 'Заочна') edForm = 'DISTANCE';
    if (edForm === 'Екстернат') edForm = 'EXTERN';

    form.setValues({
      email: student.user?.email || '',
      fullName: student.fullName,
      groupId: student.groupId,
      educationForm: edForm,
      role: 'STUDENT'
    });
    open();
  };

  const handleSave = async (values: typeof form.values) => {
    try {
      if (editingStudent) {
        await apiClient.put(`/admin/users/${editingStudent.userId}`, values);
        notifications.show({ title: 'Успіх', message: 'Профіль студента оновлено', color: 'teal' });
      } else {
        await apiClient.post('/admin/users', values);
        notifications.show({ title: 'Успіх', message: 'Студента створено', color: 'teal' });
      }
      close();
      fetchStudents(pagination.page);
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося зберегти зміни', color: 'red' });
    }
  };

  const handleBlockToggle = async (student: Student) => {
    try {
      await apiClient.patch(`/admin/users/${student.userId}/block`, { isBlocked: !student.user?.isBlocked });
      notifications.show({
        title: student.user?.isBlocked ? 'Розблоковано' : 'Заблоковано',
        message: `Студента ${student.fullName} ${student.user?.isBlocked ? 'розблоковано' : 'заблоковано'}`,
        color: student.user?.isBlocked ? 'teal' : 'orange'
      });
      fetchStudents(pagination.page);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей акаунт? Це видалить усі повʼязані дані назавжди.')) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      notifications.show({ title: 'Успіх', message: 'Студента видалено', color: 'teal' });
      fetchStudents(pagination.page);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося видалити студента', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    groupForm.setValues({
      name: group.name,
      description: group.description || '',
      educationalProgramId: group.educationalProgramId,
      currentSemester: group.currentSemester || 1
    });
    openGroup();
  };

  const handleSaveGroup = async (values: typeof groupForm.values) => {
    try {
      if (editingGroup) {
        await apiClient.put(`/admin/groups/${editingGroup.id}`, values);
      } else {
        await apiClient.post('/admin/groups', values);
      }
      notifications.show({ title: 'Успіх', message: 'Групу збережено', color: 'teal' });
      closeGroup();
      fetchGroups();
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося зберегти групу', color: 'red' });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await apiClient.delete(`/admin/groups/${id}`);
      fetchGroups();
      notifications.show({ title: 'Успіх', message: 'Групу видалено', color: 'teal' });
    } catch (error: any) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.message || 'Видалення не вдалося (можливо в групі є студенти)',
        color: 'red'
      });
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setUploadLoading(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResults(res.data.data);
      notifications.show({ title: 'Імпорт завершено', message: `Успішно додано: ${res.data.data.success}`, color: 'teal' });
      fetchStudents(1);
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || error.message || 'Не вдалося імпортувати файл', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGroupImport = async (file: File | null) => {
    if (!file) return;
    setUploadLoading(true);
    setGroupImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/admin/groups/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGroupImportResults(res.data.data);
      notifications.show({ title: 'Імпорт завершено', message: `Оброблено груп: ${res.data.data.total}`, color: 'teal' });
      fetchGroups();
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || error.message || 'Не вдалося імпортувати групи', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <Stack gap="xl">
      <Box>
        <Text size="xl" fw={800} className="premium-text-gradient">Академічний облік</Text>
        <Text size="xs" c="dimmed">Керування студентами та академічними групами</Text>
      </Box>

      <Tabs value={activeTab} onChange={setActiveTab} color="brand" variant="pills" radius="md">
        <Tabs.List p={4} mb="xl" style={{ display: 'inline-flex' }}>
          <Tabs.Tab value="students" px="xl">Студенти</Tabs.Tab>
          <Tabs.Tab value="groups" px="xl">Групи</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="students">
          <Stack gap="xl">
            <Group justify="space-between" wrap="wrap">
              <TextInput
                placeholder="Пошук студента..."
                size="md"
                radius="md"
                leftSection={<IconSearch size={18} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ flex: 1, maxWidth: 400 }}
              />
              <Group wrap="wrap" gap="md">
                <Button
                  variant="light"
                  color="brand"
                  radius="md"
                  size="md"
                  leftSection={<IconFilter size={18} />}
                  rightSection={activeFiltersCount > 0 ? <Badge size="xs" circle color="brand">{activeFiltersCount}</Badge> : (openedFilters ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />)}
                  onClick={toggleFilters}
                >
                  Фільтри
                </Button>
                <Button variant="light" size="md" leftSection={<IconUpload size={18} />} onClick={openImport} color="brand" radius="md">
                  Імпорт
                </Button>
                <Button size="md" leftSection={<IconPlus size={18} />} onClick={() => { setEditingStudent(null); form.reset(); open(); }} color="brand" radius="md">
                  Додати студента
                </Button>
              </Group>
            </Group>

            <Collapse expanded={openedFilters}>
              <Paper p="md" mb="xl" withBorder>
                <Grid align="flex-end">
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Select
                      label="Освітня програма"
                      placeholder="Всі освітні програми"
                      data={educationalPrograms.map(s => ({ value: s.id, label: s.name }))}
                      clearable
                      searchable
                      radius="md"
                      size="sm"
                      value={filterProgram}
                      onChange={setFilterProgram}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Select
                      label="Семестр"
                      placeholder="Всі семестри"
                      data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                      clearable
                      radius="md"
                      size="sm"
                      value={filterYear}
                      onChange={setFilterYear}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Select
                      label="Статус"
                      placeholder="Всі статуси"
                      data={[
                        { value: 'active', label: 'Активні' },
                        { value: 'blocked', label: 'Заблоковані' }
                      ]}
                      clearable
                      radius="md"
                      size="sm"
                      value={filterStatus}
                      onChange={setFilterStatus}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>
            </Collapse>

            <Paper p="xl" bg="transparent" style={{ border: 'none', boxShadow: 'none' }}>
              {!filterGroup && (
                <Stack gap="xl">
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    <UnstyledButton onClick={() => setFilterGroup('ALL_STUDENTS')} style={{ display: 'flex' }}>
                      <Paper p="xl" radius="md" withBorder style={{ flex: 1, cursor: 'pointer' }}>
                        <Group justify="space-between" mb="xs">
                          <ThemeIcon variant="light" color="brand" radius="md">
                            <IconUsers size={20} />
                          </ThemeIcon>
                        </Group>
                        <Text fw={700} size="lg">Всі студенти</Text>
                        <Text size="xs" c="dimmed">Повний реєстр закладу</Text>
                      </Paper>
                    </UnstyledButton>

                    {groups
                      .filter((group) => {
                        // 1. Filter by Educational Program if selected
                        if (filterProgram && group.educationalProgramId !== filterProgram) {
                          return false;
                        }
                        // 2. Filter by Semester if selected (based on loaded students)
                        if (filterYear) {
                          const hasStudentsInSemester = students.some(s => s.groupId === group.id);
                          if (!hasStudentsInSemester) return false;
                        }
                        // 3. Filter by search query if present
                        if (search) {
                          const nameMatches = group.name.toLowerCase().includes(search.toLowerCase());
                          const hasMatchingStudents = students.some(s => s.groupId === group.id && s.fullName.toLowerCase().includes(search.toLowerCase()));
                          if (!nameMatches && !hasMatchingStudents) return false;
                        }
                        return true;
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((group) => {
                        const studentCount = group._count?.students || 0;
                        const pluralStudents = studentCount === 1
                          ? 'студент'
                          : (studentCount % 10 >= 2 && studentCount % 10 <= 4 && (studentCount % 100 < 10 || studentCount % 100 >= 20)
                            ? 'студенти'
                            : 'студентів');

                        return (
                          <UnstyledButton key={group.id} onClick={() => setFilterGroup(group.id)} style={{ display: 'flex' }}>
                            <Paper p="xl" radius="md" withBorder style={{ flex: 1, cursor: 'pointer' }}>
                              <Group justify="space-between" mb="xs">
                                <ThemeIcon variant="light" color="brand" radius="md">
                                  <IconHierarchy size={20} />
                                </ThemeIcon>
                                {group._count?.students !== undefined && (
                                  <Badge variant="light" color="brand" size="sm">
                                    {studentCount} {pluralStudents}
                                  </Badge>
                                )}
                              </Group>
                              <Text fw={700} size="lg">{group.name}</Text>
                              <Text size="xs" c="dimmed">{group.educationalProgram?.name || 'Академічна одиниця'}</Text>
                            </Paper>
                          </UnstyledButton>
                        );
                      })}
                  </SimpleGrid>
                </Stack>
              )}

              {filterGroup && (
                <Stack gap="xl">
                  <Group justify="space-between">
                    <Group gap="md">
                      <ActionIcon variant="light" size="xl" radius="md" color="brand" onClick={() => setFilterGroup(null)}>
                        <IconArrowLeft size={20} />
                      </ActionIcon>
                      <Box>
                        <Text size="xl" fw={800}>
                          {filterGroup === 'ALL_STUDENTS'
                            ? 'Всі студенти'
                            : `Студенти групи ${groups.find(g => g.id === filterGroup)?.name || ''}`}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {filterGroup === 'ALL_STUDENTS'
                            ? 'Загальний список студентів закладу'
                            : `Освітня програма: ${groups.find(g => g.id === filterGroup)?.educationalProgram?.name || 'Не вказано'}`}
                        </Text>
                      </Box>
                    </Group>
                  </Group>

                  <Paper p={0} withBorder radius="md" style={{ overflow: 'hidden' }}>
                    <ScrollArea h={600}>
                      <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 800 }}>
                        <Table.Thead bg="light-dark(gray.0, dark.6)">
                          <Table.Tr>
                            <Table.Th>ПІБ</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Освітня програма</Table.Th>
                            <Table.Th>Статус</Table.Th>
                            <Table.Th style={{ width: '120px' }}>Дії</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {(filterGroup === 'ALL_STUDENTS' ? students : students.filter(s => s.groupId === filterGroup)).map((student) => (
                            <Table.Tr key={student.userId}>
                              <Table.Td>
                                <Group gap="sm" wrap="nowrap" style={{ maxWidth: 300 }}>
                                  <Avatar color="brand" radius="xl" size="sm" style={{ flexShrink: 0 }}>
                                    {student.fullName.charAt(0)}
                                  </Avatar>
                                  <Box style={{ flex: 1, minWidth: 0 }}>
                                    <Text fw={700} size="sm" truncate>{student.fullName}</Text>
                                    <Text size="10px" c="dimmed" truncate>
                                      Група: {student.group?.name || '-'} • {student.group?.currentSemester || 1} сем. • {EDUCATION_FORMS.find(f => f.value === student.educationForm)?.label || student.educationForm}
                                    </Text>
                                  </Box>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">{student.user?.email || '-'}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="dot" color="teal" size="xs">{student.group?.educationalProgram?.name || '-'}</Badge>
                              </Table.Td>
                              <Table.Td>
                                {student.user.isBlocked ? (
                                  <Badge color="red" variant="light" size="xs">Заблоковано</Badge>
                                ) : (
                                  <Badge color="brand" variant="light" size="xs">Активний</Badge>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Group gap={6} wrap="nowrap" justify="flex-end">
                                  <ActionIcon onClick={() => handleEdit(student)} variant="subtle" color="brand" radius="md">
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                  <ActionIcon onClick={() => handleBlockToggle(student)} variant="subtle" color={student.user.isBlocked ? 'teal' : 'orange'} radius="md">
                                    {student.user.isBlocked ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                                  </ActionIcon>
                                  <ActionIcon onClick={() => handleDelete(student.userId)} variant="subtle" color="red" radius="md">
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Paper>

                  {pagination.totalPages > 1 && (
                    <Group justify="center" mt="md">
                      <Pagination
                        total={pagination.totalPages}
                        value={pagination.page}
                        onChange={fetchStudents}
                        color="brand"
                        radius="md"
                      />
                    </Group>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="groups">
          <Paper p="xl" withBorder radius="md">
            <Group justify="space-between" mb="xl">
              <Box>
                <Text fw={600}>Академічні групи</Text>
                <Text size="xs" c="dimmed">Керування списком навчальних груп закладу</Text>
              </Box>
              <Group>
                <Button size="md" variant="light" color="brand" radius="md" leftSection={<IconUpload size={18} />} onClick={openGroupImport}>
                  Імпорт груп
                </Button>
                <Button size="md" variant="light" color="brand" radius="md" leftSection={<IconPlus size={18} />} onClick={() => { setEditingGroup(null); groupForm.reset(); openGroup(); }}>
                  Додати групу
                </Button>
              </Group>
            </Group>

            <ScrollArea>
              <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 600 }}>
                <Table.Thead bg="light-dark(gray.0, dark.6)">
                  <Table.Tr>
                    <Table.Th>Назва</Table.Th>
                    <Table.Th>Освітня програма</Table.Th>
                    <Table.Th ta="center">Семестр</Table.Th>
                    <Table.Th ta="center">Студентів</Table.Th>
                    <Table.Th style={{ width: 100 }} ta="right">Дії</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groups.sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                    <Table.Tr key={group.id}>
                      <Table.Td fw={700}>{group.name}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="teal" size="sm">{group.educationalProgram?.name}</Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge variant="light" color="orange" size="sm">{group.currentSemester} семестр</Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge variant="dot" color="gray">{group._count?.students || 0}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <Tooltip label="Редагувати">
                            <ActionIcon variant="subtle" color="brand" radius="md" onClick={() => handleEditGroup(group)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Видалити">
                            <ActionIcon variant="subtle" color="red" radius="md" onClick={() => handleDeleteGroup(group.id)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={opened} onClose={close} title={editingStudent ? 'Редагувати профіль' : 'Новий студент'} centered size="lg">
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="md">
            <TextInput label="Email" placeholder="user@example.com" required {...form.getInputProps('email')} disabled={!!editingStudent} />
            <TextInput label="ПІБ" placeholder="Прізвище Імʼя По батькові" required {...form.getInputProps('fullName')} />
            <Group grow>
              <Select label="Група" placeholder="Оберіть групу" data={groups.map(g => ({ value: g.id, label: g.name }))} required searchable {...form.getInputProps('groupId')} />
              <Select label="Форма навчання" data={EDUCATION_FORMS} {...form.getInputProps('educationForm')} />
            </Group>
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={importOpened} onClose={closeImport} title="Масовий імпорт студентів" centered size="lg">
        <Stack gap="md">
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-brand-light)">
            <Text fw={700} size="sm" mb="xs">Інструкція:</Text>
            <Text size="xs" mb={4}>• Підтримуються формати: <b>.xlsx, .csv, .json</b></Text>
            <Text size="xs" mb={4}>• Обов'язкові колонки: <b>Email, ПІБ, Група, Освітня програма</b></Text>
            <Text size="xs" mb={4}>• Додаткові: <b>Семестр (1-12), Форма навчання</b></Text>
            <Text size="xs" c="brand" fw={600}>• Якщо студент з таким email вже існує, його дані будуть оновлені.</Text>
          </Paper>

          <FileInput
            label="Оберіть файл для імпорту"
            placeholder="Файл не обрано"
            accept=".xlsx,.xls,.csv,.json"
            leftSection={<IconUpload size={14} />}
            onChange={handleFileUpload}
            disabled={uploadLoading}
            size="md"
            radius="md"
          />

          {uploadLoading && (
            <Paper p="md" withBorder radius="md">
              <Group gap="sm">
                <Text size="sm">Обробка даних...</Text>
              </Group>
            </Paper>
          )}

          {importResults && (
            <Paper p="md" withBorder radius="md" bg="gray.0">
              <Stack gap="xs">
                <Text fw={700} size="sm">Результати імпорту:</Text>
                <Group gap="xl">
                  <Text size="sm">Всього: <b>{importResults.total}</b></Text>
                  <Text size="sm" c="teal">Успішно: <b>{importResults.success}</b></Text>
                  <Text size="sm" c="red">Помилок: <b>{importResults.failed}</b></Text>
                </Group>
                {importResults.errors.length > 0 && (
                  <ScrollArea.Autosize mah={150}>
                    <Stack gap={4}>
                      {importResults.errors.map((err, i) => (
                        <Text key={i} size="xs" c="red">• {err}</Text>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeImport} radius="md">Закрити</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={groupImportOpened} onClose={closeGroupImport} title="Імпорт академічних груп" centered size="lg">
        <Stack gap="md">
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-brand-light)">
            <Text fw={700} size="sm" mb={4}>Інструкція:</Text>
            <Text size="xs" mb={4}>• Обов'язкові колонки: <b>Назва групи, Освітня програма</b></Text>
            <Text size="xs" mb={4}>• Опціональні колонки: <b>Семестр (1-12)</b>, <b>Опис</b></Text>
            <Text size="xs" c="brand" fw={600}>• Якщо група з такою назвою вже існує, вона буде оновлена.</Text>
          </Paper>

          <FileInput
            label="Оберіть файл для груп"
            placeholder="Файл не обрано"
            accept=".xlsx,.xls,.csv,.json"
            leftSection={<IconUpload size={14} />}
            onChange={handleGroupImport}
            disabled={uploadLoading}
            size="md"
            radius="md"
          />

          {groupImportResults && (
            <Paper p="md" withBorder radius="md" bg="gray.0">
              <Stack gap="xs">
                <Text fw={700} size="sm">Результати:</Text>
                <Group gap="xl">
                  <Text size="sm">Всього: <b>{groupImportResults.total}</b></Text>
                  <Text size="sm" c="teal">Успішно: <b>{groupImportResults.success}</b></Text>
                  <Text size="sm" c="red">Помилок: <b>{groupImportResults.failed}</b></Text>
                </Group>
                {groupImportResults.errors.length > 0 && (
                  <ScrollArea.Autosize mah={150} mt="xs">
                    <Stack gap={4}>
                      {groupImportResults.errors.map((err, i) => (
                        <Text key={i} size="xs" c="red">• {err}</Text>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeGroupImport} radius="md">Закрити</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={groupOpened} onClose={closeGroup} title={editingGroup ? 'Редагувати групу' : 'Нова група'} centered>
        <form onSubmit={groupForm.onSubmit(handleSaveGroup)}>
          <Stack gap="md">
            <TextInput label="Назва групи" placeholder="Наприклад: КН-41" required {...groupForm.getInputProps('name')} />
            <Group grow>
              <Select
                label="Освітня програма"
                placeholder="Оберіть освітню програму"
                data={educationalPrograms.map(s => ({ value: s.id, label: s.name }))}
                required
                {...groupForm.getInputProps('educationalProgramId')}
              />
              <Select
                label="Семестр"
                data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                required
                {...groupForm.getInputProps('currentSemester')}
                value={String(groupForm.values.currentSemester)}
                onChange={(v) => groupForm.setFieldValue('currentSemester', Number(v))}
              />
            </Group>
            <TextInput label="Опис" placeholder="Додаткова інформація" {...groupForm.getInputProps('description')} />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={closeGroup}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default StudentManagement;

import React, { useEffect, useState } from 'react';
import { Paper, Table, Button, Group, ActionIcon, Modal, Stack, Badge, Text, ScrollArea, List, TextInput, Select, Box, Grid, Collapse, Avatar, UnstyledButton, Center, SimpleGrid, ThemeIcon, Loader, Divider, Pagination } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconX, IconEye, IconRefresh, IconSearch, IconFilter, IconChevronDown, IconChevronUp, IconArrowLeft, IconHierarchy, IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';

interface Trajectory {
  id: string;
  studentId: string;
  semester: number;
  status: string;
  createdAt: string;
  student: {
    fullName: string;
    groupCode?: string;
    group?: { name: string };
    user: { email: string };
  };
  items: {
    id: string;
    course: {
      name: string;
      ectsCredits: number;
    };
  }[];
}

const TrajectoryReview: React.FC = () => {
  const [trajectories, setTrajectories] = useState<Trajectory[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');

  const [openedFilters, { toggle: toggleFilters }] = useDisclosure(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedTrajectory, setSelectedTrajectory] = useState<Trajectory | null>(null);
  const [educationalPrograms, setEducationalPrograms] = useState<any[]>([]);
  const [programFilter, setProgramFilter] = useState<string | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);

  const [rejectOpened, { open: openReject, close: closeReject }] = useDisclosure(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [forceModalOpened, { open: openForceModal, close: closeForceModal }] = useDisclosure(false);
  const [forceStep, setForceStep] = useState<1 | 2>(1);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [targetSemester, setTargetSemester] = useState<string>('3');
  const [forceLoading, setForceLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const fetchEducationalPrograms = async () => {
    try {
      const res = await apiClient.get('/admin/educational-programs');
      setEducationalPrograms(res.data.data);
    } catch (error) {
      console.error('Failed to fetch educational programs', error);
    }
  };

  const fetchTrajectories = async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/trajectories', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          educationalProgramId: programFilter || undefined,
          semester: semesterFilter || undefined,
          page,
          limit: 100
        }
      });
      setTrajectories(res.data.data.trajectories);
      setPagination(res.data.data.pagination);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити траєкторії', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await apiClient.get('/admin/students/groups');
      setGroups(res.data.data);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  useEffect(() => {
    fetchEducationalPrograms();
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchTrajectories(1);
  }, [statusFilter, programFilter, semesterFilter, filterGroup, search]);

  const activeFiltersCount = [statusFilter, programFilter, semesterFilter, search].filter(Boolean).length;

  const handleApprove = async (id: string) => {
    try {
      await apiClient.patch(`/admin/trajectories/${id}/approve`);
      notifications.show({ title: 'Успіх', message: 'Траєкторію затверджено', color: 'teal' });
      fetchTrajectories(pagination.page);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const handleReject = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    openReject();
  };

  const submitReject = async () => {
    if (!rejectingId) return;
    try {
      await apiClient.patch(`/admin/trajectories/${rejectingId}/reject`, { reason: rejectReason || undefined });
      notifications.show({ title: 'Виконано', message: 'Траєкторію відхилено', color: 'orange' });
      fetchTrajectories(pagination.page);
      closeReject();
      setRejectReason('');
      setRejectingId(null);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/admin/trajectories/${id}`);
      notifications.show({ title: 'Виконано', message: 'Траєкторію видалено', color: 'teal' });
      fetchTrajectories(pagination.page);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const fetchStudentsForForce = async (query: string) => {
    setStudentsLoading(true);
    try {
      const res = await apiClient.get('/admin/students', { params: { search: query, limit: 10 } });
      setStudentsList(res.data.data.students);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося знайти студентів', color: 'red' });
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    const nextSem = String(student.currentSemester + 1);
    setTargetSemester(nextSem);
    setSelectedCourseIds([]);

    try {
      const res = await apiClient.get('/admin/courses', { params: { limit: 5000 } });
      const allCourses = res.data.data.courses;
      const filtered = allCourses.filter((c: any) =>
        (!c.educationalProgramLinks || c.educationalProgramLinks.length === 0 || c.educationalProgramLinks.some((sl: any) => sl.educationalProgramId === student.educationalProgramId))
      );
      setAvailableCourses(filtered);

      const semNum = Number(nextSem);
      const mandatoryIds = filtered
        .filter((c: any) => !c.isSelective && c.semester === semNum)
        .map((c: any) => c.id);
      setSelectedCourseIds(mandatoryIds);

      setForceStep(2);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити курси', color: 'red' });
    }
  };

  const handleForceSubmit = async () => {
    if (!selectedStudent) return;
    setForceLoading(true);
    try {
      await apiClient.post('/admin/trajectories/force', {
        studentId: selectedStudent.id,
        semester: Number(targetSemester),
        courseIds: selectedCourseIds
      });
      notifications.show({ title: 'Успіх', message: 'Траєкторію успішно призначено', color: 'teal' });
      closeForceModal();
      fetchTrajectories(1);
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Помилка призначення', color: 'red' });
    } finally {
      setForceLoading(false);
    }
  };

  const viewDetails = (trajectory: Trajectory) => {
    setSelectedTrajectory(trajectory);
    open();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'brand';
      case 'REJECTED': return 'red';
      case 'PENDING': return 'brand';
      case 'SUBMITTED': return 'brand';
      default: return 'gray';
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Box>
          <Text size="xl" fw={800} className="premium-text-gradient">Запити траєкторій</Text>
          <Text size="xs" c="dimmed">Розгляд та затвердження індивідуальних планів навчання студентів</Text>
        </Box>
        <Group justify="space-between" wrap="wrap">
          <TextInput
            placeholder="Пошук студента (ПІБ або email)..."
            size="md"
            radius="md"
            leftSection={<IconSearch size={18} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTrajectories(1)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Group gap="md">
            <Button
              variant="filled"
              color="brand"
              radius="md"
              size="md"
              leftSection={<IconPlus size={18} />}
              onClick={() => { setForceStep(1); openForceModal(); }}
            >
              Призначити траєкторію
            </Button>
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
            <ActionIcon onClick={() => fetchTrajectories(pagination.page)} loading={loading} variant="light" color="brand" size="md" radius="md" style={{ height: 42, width: 42 }}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Collapse expanded={openedFilters}>
          <Paper p="md" mb="xl" withBorder>
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Статус"
                  radius="md"
                  data={[
                    { value: 'PENDING', label: 'Очікують розгляду' },
                    { value: 'APPROVED', label: 'Затверджені' },
                    { value: 'REJECTED', label: 'Відхилені' },
                    { value: '', label: 'Всі статуси' }
                  ]}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v || '')}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Освітня програма"
                  radius="md"
                  placeholder="Всі освітні програми"
                  data={educationalPrograms.map(s => ({ value: s.id, label: s.name }))}
                  value={programFilter}
                  onChange={setProgramFilter}
                  clearable
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Семестр"
                  radius="md"
                  placeholder="Всі"
                  data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                  value={semesterFilter}
                  onChange={setSemesterFilter}
                  clearable
                />
              </Grid.Col>
            </Grid>
          </Paper>
        </Collapse>

        <Paper p="xl" bg="transparent" style={{ border: 'none', boxShadow: 'none' }}>
          {!filterGroup && (
            <Stack gap="xl">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                <UnstyledButton onClick={() => setFilterGroup('ALL_REQUESTS')} style={{ display: 'flex' }}>
                  <Paper
                    p="xl" radius="md" withBorder
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <Group justify="space-between" mb="xs">
                      <ThemeIcon variant="light" color="brand" radius="md">
                        <IconHierarchy size={20} />
                      </ThemeIcon>
                    </Group>
                    <Text fw={700} size="lg">Всі запити</Text>
                    <Text size="xs" c="dimmed" mb="md">Глобальний перегляд усіх подач</Text>
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>{trajectories.length} всього</Text>
                      <Group gap={4}>
                        <Text size="xs" c="red" fw={600}>{trajectories.filter(t => t.status === 'PENDING').length} очікують</Text>
                        <IconArrowLeft style={{ transform: 'rotate(180deg)' }} size={16} />
                      </Group>
                    </Group>
                  </Paper>
                </UnstyledButton>

                {groups.sort().filter(g => g.toLowerCase().includes(search.toLowerCase())).map((group) => {
                  const groupTrajectories = trajectories.filter(t => (t.student.group?.name || t.student.groupCode) === group);
                  const pendingCount = groupTrajectories.filter(t => t.status === 'PENDING').length;
                  return (
                    <UnstyledButton key={group} onClick={() => setFilterGroup(group)} style={{ display: 'flex' }}>
                      <Paper
                        p="xl" radius="md" withBorder
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        <Group justify="space-between" mb="xs">
                          <ThemeIcon variant="light" color="brand" radius="md">
                            <IconHierarchy size={20} />
                          </ThemeIcon>
                        </Group>
                        <Text fw={700} size="lg">Група {group}</Text>
                        <Text size="xs" c="dimmed" mb="md">Навчальна група</Text>
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>{groupTrajectories.length} запитів</Text>
                          <Group gap={4}>
                            {pendingCount > 0 && <Text size="xs" c="red" fw={700}>{pendingCount} очікують</Text>}
                            <IconArrowLeft style={{ transform: 'rotate(180deg)' }} size={16} />
                          </Group>
                        </Group>
                      </Paper>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </Stack>
          )}

          {filterGroup && (
            <Stack gap="xl">
              <Group gap="md">
                <ActionIcon
                  variant="light"
                  size="xl"
                  radius="md"
                  color="brand"
                  onClick={() => setFilterGroup(null)}
                >
                  <IconArrowLeft size={20} />
                </ActionIcon>
                <Box>
                  <Text size="xl" fw={800}>
                    {filterGroup === 'ALL_REQUESTS' ? 'Всі запити' : `Запити групи ${filterGroup}`}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {statusFilter === 'PENDING' ? 'Перегляд та затвердження нових заявок' : 'Архів опрацьованих траєкторій'}
                  </Text>
                </Box>
              </Group>

              <Paper p={0} withBorder radius="md" style={{ overflow: 'hidden' }}>
                <ScrollArea h={600}>
                  <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 800 }}>
                    <Table.Thead bg="light-dark(gray.0, dark.6)">
                      <Table.Tr>
                        <Table.Th>Студент</Table.Th>
                        <Table.Th>Семестр</Table.Th>
                        <Table.Th>Дата подачі</Table.Th>
                        <Table.Th>Статус</Table.Th>
                        <Table.Th>Дії</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(filterGroup === 'ALL_REQUESTS' ? trajectories : trajectories.filter(t => (t.student.group?.name || t.student.groupCode) === filterGroup)).map((t) => (
                        <Table.Tr key={t.id}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap" style={{ maxWidth: 300 }}>
                              <Avatar color="brand" radius="xl" size="sm" style={{ flexShrink: 0 }}>
                                {t.student.fullName.charAt(0)}
                              </Avatar>
                              <Box style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={700} size="sm" truncate>{t.student.fullName}</Text>
                                <Text size="10px" c="dimmed" truncate>{t.student.user.email}</Text>
                              </Box>
                            </Group>
                          </Table.Td>
                          <Table.Td>{t.semester}</Table.Td>
                          <Table.Td>{new Date(t.createdAt).toLocaleDateString()}</Table.Td>
                          <Table.Td>
                            <Badge color={statusColor(t.status)} variant="light" radius="sm" size="xs">{t.status}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} justify="flex-end" wrap="nowrap">
                              <ActionIcon variant="subtle" color="brand" radius="md" onClick={() => viewDetails(t)} title="Переглянути">
                                <IconEye size={16} />
                              </ActionIcon>
                              {t.status === 'PENDING' && (
                                <>
                                  <ActionIcon variant="subtle" color="brand" radius="md" onClick={() => handleApprove(t.id)} title="Затвердити">
                                    <IconCheck size={16} />
                                  </ActionIcon>
                                  <ActionIcon variant="subtle" color="red" radius="md" onClick={() => handleReject(t.id)} title="Відхилити">
                                    <IconX size={16} />
                                  </ActionIcon>
                                </>
                              )}
                              <ActionIcon variant="subtle" color="red" radius="md" onClick={() => handleDelete(t.id)} title="Видалити">
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {(filterGroup === 'ALL_REQUESTS' ? trajectories : trajectories.filter(t => (t.student.group?.name || t.student.groupCode) === filterGroup)).length === 0 && (
                    <Center h={300}>
                      <Stack align="center" gap="xs">
                        <IconAlertCircle size={32} color="gray" />
                        <Text c="dimmed">Жодних запитів не знайдено</Text>
                      </Stack>
                    </Center>
                  )}
                </ScrollArea>
              </Paper>

              {pagination.totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination
                    total={pagination.totalPages}
                    value={pagination.page}
                    onChange={fetchTrajectories}
                    color="brand"
                    radius="md"
                  />
                </Group>
              )}
            </Stack>
          )}
        </Paper>


        <Modal opened={opened} onClose={close} title="Деталі траєкторії" size="lg" centered radius="md">
          {selectedTrajectory && (
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Group gap="xs" align="center">
                    <Text fw={700} size="lg">{selectedTrajectory.student.fullName}</Text>
                    {selectedTrajectory.student.group?.name && (
                      <Badge variant="light" color="blue">{selectedTrajectory.student.group.name}</Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">Семестр: {selectedTrajectory.semester}</Text>
                </div>
                <Badge size="xl" color={statusColor(selectedTrajectory.status)} variant="light" radius="sm">{selectedTrajectory.status}</Badge>
              </Group>

              <Text fw={600} mb={-10}>Обрані дисципліни:</Text>
              <Paper p="md" bg="var(--mantine-color-gray-0)" withBorder>
                <ScrollArea.Autosize mah={300}>
                  <List spacing="sm" size="sm" center icon={<IconCheck size={14} color="var(--mantine-color-brand-6)" />}>
                    {selectedTrajectory.items.map(item => (
                      <List.Item key={item.id}>
                        <Group justify="space-between">
                          <Text fw={500}>{item.course.name}</Text>
                          <Badge variant="dot" color="brand">{item.course.ectsCredits} ECTS</Badge>
                        </Group>
                      </List.Item>
                    ))}
                  </List>
                </ScrollArea.Autosize>
                <Group justify="flex-end" mt="md" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                  <Text fw={700}>Всього кредитів: {selectedTrajectory.items.reduce((acc, item) => acc + item.course.ectsCredits, 0)}</Text>
                </Group>
              </Paper>

              <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={close} radius="md">Закрити</Button>
                {selectedTrajectory.status === 'PENDING' && (
                  <>
                    <Button variant="light" color="red" radius="md" onClick={() => { handleReject(selectedTrajectory.id); close(); }}>Відхилити</Button>
                    <Button color="brand" radius="md" onClick={() => { handleApprove(selectedTrajectory.id); close(); }}>Затвердити</Button>
                  </>
                )}
              </Group>
            </Stack>
          )}
        </Modal>


        <Modal opened={forceModalOpened} onClose={closeForceModal} title="Примусове призначення траєкторії" size="lg" centered radius="md">
          {forceStep === 1 ? (
            <Stack gap="md">
              <TextInput
                label="Пошук студента"
                placeholder="ПІБ або email"
                leftSection={<IconSearch size={16} />}
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.currentTarget.value);
                  if (e.currentTarget.value.length > 2) fetchStudentsForForce(e.currentTarget.value);
                }}
                radius="md"
              />
              <ScrollArea h={300}>
                <Stack gap="xs">
                  {studentsList.map(s => (
                    <UnstyledButton
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      p="sm"
                      className="glass-card"
                      style={{ borderRadius: '10px' }}
                    >
                      <Group wrap="nowrap">
                        <Avatar color="brand" radius="xl">{s.fullName.charAt(0)}</Avatar>
                        <Box style={{ flex: 1 }}>
                          <Text fw={700} size="sm">{s.fullName}</Text>
                          <Text size="xs" c="dimmed">{s.educationalProgram.name} | {s.group.name}</Text>
                        </Box>
                      </Group>
                    </UnstyledButton>
                  ))}
                  {studentsList.length === 0 && !studentsLoading && studentSearch.length > 2 && (
                    <Center py="xl"><Text c="dimmed" size="sm">Студентів не знайдено</Text></Center>
                  )}
                  {studentsLoading && <Center py="xl"><Loader size="sm" color="brand" type="bars" /></Center>}
                </Stack>
              </ScrollArea>
            </Stack>
          ) : (
            <Stack gap="md">
              <Group gap="sm" mb="xs">
                <ActionIcon variant="light" onClick={() => setForceStep(1)} radius="md">
                  <IconArrowLeft size={16} />
                </ActionIcon>
                <Box>
                  <Text fw={700}>{selectedStudent?.fullName}</Text>
                  <Text size="xs" c="dimmed">{selectedStudent?.educationalProgram.name}</Text>
                </Box>
              </Group>

              <Group grow>
                <Select
                  label="Семестр"
                  data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                  value={targetSemester}
                  onChange={(v) => {
                    const newSem = v || '1';
                    setTargetSemester(newSem);
                    const semNum = Number(newSem);
                    const mandatoryIds = availableCourses
                      .filter((c: any) => !c.isSelective && c.semester === semNum)
                      .map((c: any) => c.id);
                    setSelectedCourseIds(mandatoryIds);
                  }}
                  radius="md"
                />
                <TextInput
                  label="Пошук дисципліни"
                  placeholder="Назва..."
                  leftSection={<IconSearch size={16} />}
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.currentTarget.value)}
                  radius="md"
                />
              </Group>

              <Divider label="Вибір курсів" labelPosition="center" />

              <ScrollArea h={300}>
                <Stack gap="xs">
                  {availableCourses
                    .filter(c => !c.semester || String(c.semester) === targetSemester)
                    .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                    .map(course => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      return (
                        <Paper
                          key={course.id}
                          withBorder
                          p="xs"
                          radius="md"
                          onClick={() => {
                            if (isSelected) setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                            else setSelectedCourseIds([...selectedCourseIds, course.id]);
                          }}
                          style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--mantine-color-brand-6)' : undefined, backgroundColor: isSelected ? 'var(--mantine-color-brand-0)' : undefined }}
                        >
                          <Group justify="space-between" wrap="nowrap">
                            <Box>
                              <Text size="sm" fw={600}>{course.name}</Text>
                              <Text size="xs" c="dimmed">{course.ectsCredits} ECTS | {course.isSelective ? 'Вибіркова' : 'Обовʼязкова'}</Text>
                            </Box>
                            {isSelected && <IconCheck size={18} color="var(--mantine-color-brand-6)" />}
                          </Group>
                        </Paper>
                      );
                    })}

                  {availableCourses
                    .filter(c => !c.semester || String(c.semester) === targetSemester)
                    .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                    .length === 0 && (
                      <Center py="xl">
                        <Text size="sm" c="dimmed">Дисциплін не знайдено</Text>
                      </Center>
                    )}
                </Stack>
              </ScrollArea>

              <Paper p="sm" bg="gray.0" radius="md">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>Обрано курсів: {selectedCourseIds.length}</Text>
                  <Text size="sm" fw={700}>ECTS: {availableCourses.filter(c => selectedCourseIds.includes(c.id)).reduce((acc, c) => acc + c.ectsCredits, 0)}</Text>
                </Group>
              </Paper>

              <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={closeForceModal}>Скасувати</Button>
                <Button color="brand" onClick={handleForceSubmit} loading={forceLoading} disabled={selectedCourseIds.length === 0}>
                  Призначити траєкторію
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

        <Modal opened={rejectOpened} onClose={closeReject} title="Відхилити траєкторію" centered size="md" radius="md">
          <Stack gap="md">
            <TextInput
              label="Причина відхилення (опціонально)"
              placeholder="Вкажіть причину, наприклад: Невідповідність вимогам..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.currentTarget.value)}
              radius="md"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeReject} radius="md">Скасувати</Button>
              <Button color="red" onClick={submitReject} radius="md">Відхилити</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </>
  );
};

export default TrajectoryReview;

import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Table, Button, Group, TextInput, NumberInput, Select, Stack, Badge, Text, ScrollArea, Divider, Box, FileInput, Avatar, Modal, Grid, Collapse, Center, Drawer, UnstyledButton, SimpleGrid, ActionIcon, ThemeIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconUpload, IconSearch, IconAlertCircle, IconFilter, IconChevronDown, IconChevronUp, IconBooks, IconHierarchy, IconArrowLeft, IconArrowNarrowRight, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';
import { joiResolver, gradeManualSchema, gradeEditSchema } from '@/utils/validation';

interface AcademicRecord {
  id: string;
  student: { id: string; fullName: string; group: { name: string }; user: { email: string } } | null;
  course: { id: string; name: string; ectsCredits: number } | null;
  gradeValue: number;
  semesterCompleted: number;
  assessmentName: string | null;
  dateRecorded: string;
}

interface ImportResults {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

interface StudentInDrawer {
  id: string;
  label: string;
  subLabel: string;
  groupLabel: string;
  records: AcademicRecord[];
}

const GradeManagement: React.FC = () => {
  const [manualOpened, { open: openManual, close: closeManual }] = useDisclosure(false);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedStudentInDrawer, setSelectedStudentInDrawer] = useState<StudentInDrawer | null>(null);

  const [coursesData, setCoursesData] = useState<{ value: string, label: string }[]>([]);
  const [groupsData, setGroupsData] = useState<{ value: string, label: string, educationalProgramId: string, currentSemester: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const [openedFilters, { toggle: toggleFilters }] = useDisclosure(false);
  const [educationalPrograms, setEducationalPrograms] = useState<any[]>([]);
  const [filterProgram, setFilterProgram] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState<string | number>('');

  const [uploadLoading, setUploadLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  const [activeLevel1Id, setActiveLevel1Id] = useState<string | null>(null);

  const [groupStudents, setGroupStudents] = useState<Record<string, any[]>>({});
  const [fetchingGroupStudents, setFetchingGroupStudents] = useState<Record<string, boolean>>({});
  const [fetchingStudentRecords, setFetchingStudentRecords] = useState<Record<string, boolean>>({});

  const [modalGroupId, setModalGroupId] = useState<string>('');
  const [modalStudents, setModalStudents] = useState<{ value: string, label: string }[]>([]);

  const manualForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      studentId: '',
      courseId: '',
      gradeValue: 60,
      assessmentName: '',
    },
    validate: joiResolver(gradeManualSchema),
  });

  const editForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      id: '',
      gradeValue: 60,
      assessmentName: '',
    },
    validate: joiResolver(gradeEditSchema),
  });
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  useEffect(() => {
    if (!modalGroupId) {
      setModalStudents([]);
      return;
    }
    apiClient.get('/admin/students', { params: { groupId: modalGroupId, limit: 1000 } })
      .then(res => {
        setModalStudents(res.data.data.students.map((s: any) => ({
          value: s.id,
          label: s.fullName
        })));
      })
      .catch(() => {
        notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити студентів для обраної групи', color: 'red' });
      });
  }, [modalGroupId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [couRes, grpRes, specRes] = await Promise.all([
        apiClient.get('/admin/courses'),
        apiClient.get('/admin/groups'),
        apiClient.get('/admin/educational-programs')
      ]);

      setCoursesData(couRes.data.data.courses.map((c: any) => ({ value: c.id, label: c.name })));
      setGroupsData(grpRes.data.data.map((g: any) => ({
        value: g.id,
        label: g.name,
        educationalProgramId: g.educationalProgramId,
        currentSemester: g.currentSemester
      })));
      setEducationalPrograms(specRes.data.data);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchGroupStudents = useCallback(async (groupId: string) => {
    if (groupStudents[groupId]) return;

    setFetchingGroupStudents(prev => ({ ...prev, [groupId]: true }));
    try {
      const res = await apiClient.get('/admin/students', {
        params: { groupId, limit: 1000 }
      });
      setGroupStudents(prev => ({
        ...prev,
        [groupId]: res.data.data.students
      }));
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити студентів', color: 'red' });
    } finally {
      setFetchingGroupStudents(prev => ({ ...prev, [groupId]: false }));
    }
  }, [groupStudents]);

  const fetchStudentRecords = useCallback(async (studentId: string) => {
    setFetchingStudentRecords(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await apiClient.get('/admin/records', {
        params: {
          studentId,
          courseId: filterCourse || undefined,
          semester: filterSemester || undefined,
          limit: 1000
        }
      });
      return res.data.data.records;
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити оцінки студента', color: 'red' });
      return [];
    } finally {
      setFetchingStudentRecords(prev => ({ ...prev, [studentId]: false }));
    }
  }, [filterCourse, filterSemester]);

  const activeFiltersCount = [filterGroup, filterProgram, filterCourse, filterSemester, search].filter(Boolean).length;

  const handleGroupClick = (groupId: string) => {
    setActiveLevel1Id(groupId);
    fetchGroupStudents(groupId);
  };

  const handleManualSubmit = async (values: typeof manualForm.values) => {
    try {
      await apiClient.post('/admin/records', values);
      notifications.show({ title: 'Успіх', message: 'Оцінку збережено', color: 'teal' });
      manualForm.reset();
      setModalGroupId('');
      closeManual();

      if (selectedStudentInDrawer && selectedStudentInDrawer.id === values.studentId) {
        const recs = await fetchStudentRecords(values.studentId);
        setSelectedStudentInDrawer(prev => prev ? { ...prev, records: recs } : null);
      }
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося зберегти оцінку', color: 'red' });
    }
  };

  const handleCloseManual = () => {
    manualForm.reset();
    setModalGroupId('');
    closeManual();
  };

  const handleEditRecord = (record: AcademicRecord) => {
    editForm.setValues({
      id: record.id,
      gradeValue: record.gradeValue,
      assessmentName: record.assessmentName || '',
    });
    openEditModal();
  };

  const handleSaveEdit = async (values: typeof editForm.values) => {
    try {
      await apiClient.put(`/admin/records/${values.id}`, values);
      notifications.show({ title: 'Успіх', message: 'Оцінку оновлено', color: 'teal' });
      closeEditModal();

      if (selectedStudentInDrawer) {
        const recs = await fetchStudentRecords(selectedStudentInDrawer.id);
        setSelectedStudentInDrawer(prev => prev ? { ...prev, records: recs } : null);
      }
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося оновити оцінку', color: 'red' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю оцінку?')) return;
    try {
      await apiClient.delete(`/admin/records/${id}`);
      notifications.show({ title: 'Виконано', message: 'Оцінку видалено', color: 'teal' });

      if (selectedStudentInDrawer) {
        const recs = await fetchStudentRecords(selectedStudentInDrawer.id);
        setSelectedStudentInDrawer(prev => prev ? { ...prev, records: recs } : null);
      }
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося видалити оцінку', color: 'red' });
    }
  };

  const handleBulkUpload = async (file: File | null) => {
    if (!file) return;
    setUploadLoading(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/admin/records/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResults(res.data.data);
      notifications.show({
        title: 'Успіх',
        message: `Імпорт завершено: ${res.data.data.success} записів додано`,
        color: 'teal'
      });

      // Clear loaded cache to ensure new data reflects correctly
      setGroupStudents({});
    } catch (err: any) {
      notifications.show({ title: 'Помилка', message: err.response?.data?.message || err.message || 'Імпорт не вдався', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Box>
          <Text size="xl" fw={800} className="premium-text-gradient">Керування оцінками</Text>
          <Text size="xs" c="dimmed">Перегляд успішності студентів у розрізі академічних груп та дисциплін</Text>
        </Box>
        <Group justify="space-between" wrap="wrap">
          <TextInput
            placeholder="Швидкий пошук групи за назвою..."
            size="md"
            radius="md"
            leftSection={<IconSearch size={18} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Group gap="md">
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
            <Button size="md" leftSection={<IconPlus size={18} />} onClick={openManual} color="brand" radius="md">
              Внести оцінку
            </Button>
          </Group>
        </Group>

        <Collapse expanded={openedFilters}>
          <Paper p="md" mb="xl" withBorder>
            <Grid align="flex-end">
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  label="Група"
                  placeholder="Всі групи"
                  data={groupsData}
                  clearable
                  searchable
                  value={filterGroup}
                  onChange={setFilterGroup}
                  radius="md"
                  leftSection={<IconHierarchy size={14} />}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  label="Освітня програма"
                  placeholder="Всі освітні програми"
                  data={educationalPrograms.map(s => ({ value: s.id, label: s.name }))}
                  clearable
                  searchable
                  value={filterProgram}
                  onChange={setFilterProgram}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  label="Дисципліна"
                  placeholder="Всі дисципліни"
                  data={coursesData}
                  clearable
                  searchable
                  value={filterCourse}
                  onChange={setFilterCourse}
                  radius="md"
                  leftSection={<IconBooks size={14} />}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  label="Семестр"
                  placeholder="Всі семестри"
                  data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']}
                  clearable
                  value={String(filterSemester)}
                  onChange={(v) => setFilterSemester(v || '')}
                  radius="md"
                />
              </Grid.Col>
            </Grid>
          </Paper>
        </Collapse>

        <Paper p="xl" bg="transparent" style={{ border: 'none', boxShadow: 'none' }}>
          {!activeLevel1Id && (
            <Stack gap="xl">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {groupsData
                  .filter(g => !filterGroup || g.value === filterGroup)
                  .filter(g => !filterProgram || g.educationalProgramId === filterProgram)
                  .filter(g => !filterSemester || g.currentSemester === Number(filterSemester))
                  .filter(g => g.label.toLowerCase().includes(search.toLowerCase()))
                  .map((group) => {
                    return (
                      <UnstyledButton key={group.value} onClick={() => handleGroupClick(group.value)} style={{ display: 'flex' }}>
                        <Paper
                          p="xl" radius="md" withBorder
                          style={{ flex: 1, transition: 'transform 0.2s ease', cursor: 'pointer' }}
                        >
                          <Group justify="space-between" mb="xs">
                            <ThemeIcon size="lg" radius="md" variant="light" color="brand">
                              <IconHierarchy size={20} />
                            </ThemeIcon>
                          </Group>

                          <Box mb="md">
                            <Text fw={800} size="lg" truncate>{group.label}</Text>
                            <Text size="xs" c="dimmed">Академічна група</Text>
                          </Box>

                          <Divider mb="md" variant="dashed" />

                          <Group justify="flex-end" mt="md">
                            <Text size="xs" fw={700} color="brand" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Переглянути студентів <IconArrowNarrowRight size={14} />
                            </Text>
                          </Group>
                        </Paper>
                      </UnstyledButton>
                    );
                  })}
              </SimpleGrid>

              {groupsData.length === 0 && !loading && (
                <Center h={300}>
                  <Stack align="center" gap="sm">
                    <IconAlertCircle size={48} color="gray" />
                    <Text c="dimmed" fw={700}>Груп не знайдено</Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          )}

          {activeLevel1Id && (
            <Stack gap="xl">
              {(() => {
                const selectedGroup = groupsData.find(g => g.value === activeLevel1Id);
                if (!selectedGroup) return null;

                const students = groupStudents[activeLevel1Id] || [];
                const isGroupLoading = fetchingGroupStudents[activeLevel1Id];

                return (
                  <>
                    <Group justify="space-between">
                      <Group gap="md">
                        <ActionIcon
                          variant="light"
                          size="xl"
                          radius="md"
                          color="brand"
                          onClick={() => setActiveLevel1Id(null)}
                        >
                          <IconArrowLeft size={20} />
                        </ActionIcon>
                        <Box>
                          <Text size="xl" fw={800}>{selectedGroup.label}</Text>
                          <Text size="xs" c="dimmed">Список студентів групи</Text>
                        </Box>
                      </Group>
                    </Group>

                    {isGroupLoading ? (
                      <Center h={200}>
                        <Text c="dimmed">Завантаження студентів...</Text>
                      </Center>
                    ) : (
                      <ScrollArea h={600}>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                          {students.map((student) => {
                            return (
                              <UnstyledButton
                                key={student.id}
                                onClick={async () => {
                                  setSelectedStudentInDrawer({
                                    id: student.id,
                                    label: student.fullName,
                                    subLabel: student.user?.email || '',
                                    groupLabel: selectedGroup.label,
                                    records: []
                                  });
                                  openDrawer();
                                  const recs = await fetchStudentRecords(student.id);
                                  setSelectedStudentInDrawer(prev => prev ? { ...prev, records: recs } : null);
                                }}
                              >
                                <Paper p="md" radius="md" withBorder style={{ background: 'var(--mantine-color-gray-0)', border: '1px solid var(--mantine-color-gray-1)', transition: 'transform 0.15s ease', cursor: 'pointer' }}>
                                  <Group justify="space-between" wrap="nowrap">
                                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                      <Avatar color="brand" radius="xl" size="md">
                                        {student.fullName.charAt(0)}
                                      </Avatar>
                                      <Box style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" fw={700} truncate>{student.fullName}</Text>
                                        <Text size="10px" c="dimmed" truncate>{student.user?.email || ''}</Text>
                                      </Box>
                                    </Group>
                                    <IconArrowNarrowRight size={16} color="var(--mantine-color-gray-5)" />
                                  </Group>
                                </Paper>
                              </UnstyledButton>
                            );
                          })}
                        </SimpleGrid>
                        {students.length === 0 && (
                          <Center h={200}>
                            <Text c="dimmed">У цій групі немає студентів</Text>
                          </Center>
                        )}
                      </ScrollArea>
                    )}
                  </>
                );
              })()}
            </Stack>
          )}
        </Paper>
      </Stack>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="lg"
        title="Детальна інформація про студента"
        padding="xl"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        styles={{
          header: { paddingBottom: '1rem', borderBottom: '1px solid var(--mantine-color-gray-2)' },
          title: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--mantine-color-brand-7)' }
        }}
      >
        {selectedStudentInDrawer && (
          <Stack gap="xl">
            <Paper p="md" radius="md" withBorder style={{ background: 'var(--mantine-color-gray-0)' }}>
              <Group align="flex-start" wrap="nowrap">
                <Avatar size="xl" radius="xl" color="brand">
                  {selectedStudentInDrawer.label.charAt(0)}
                </Avatar>
                <Box style={{ flex: 1 }}>
                  <Text size="lg" fw={800}>{selectedStudentInDrawer.label}</Text>
                  <Text size="sm" c="dimmed" mb="xs">{selectedStudentInDrawer.subLabel}</Text>
                  <Divider my="sm" />
                  <Group gap="xs">
                    <Badge variant="light" color="brand">{selectedStudentInDrawer.groupLabel}</Badge>
                  </Group>
                </Box>
              </Group>
            </Paper>

            <Box>
              <Group justify="space-between" mb="xs">
                <Text fw={700}>Історія оцінювання</Text>
              </Group>

              {fetchingStudentRecords[selectedStudentInDrawer.id] ? (
                <Center h={100}>
                  <Text size="sm" c="dimmed">Завантаження оцінок...</Text>
                </Center>
              ) : (
                (() => {
                  const groupedRecords = selectedStudentInDrawer.records.reduce((acc: any, rec: any) => {
                    const courseId = rec.course?.id || 'unknown';
                    const courseName = rec.course?.name || 'Інше';
                    const semester = rec.semesterCompleted;
                    if (!acc[courseId]) {
                      acc[courseId] = {
                        courseId,
                        courseName,
                        semester,
                        items: []
                      };
                    }
                    acc[courseId].items.push(rec);
                    return acc;
                  }, {} as Record<string, any>);

                  const groupedList = Object.values(groupedRecords) as any[];

                  if (groupedList.length === 0) {
                    return (
                      <Paper p="xl" radius="md" withBorder ta="center">
                        <Text size="sm" c="dimmed">Оцінок не знайдено</Text>
                      </Paper>
                    );
                  }

                  return (
                    <Stack gap="md">
                      {groupedList.map((group: any) => (
                        <Paper key={group.courseId} p="md" radius="md" withBorder>
                          <Group justify="space-between" mb="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)', paddingBottom: '6px' }}>
                            <Text fw={700} size="sm" style={{ flex: 1 }}>{group.courseName}</Text>
                            <Badge variant="light" color="brand" size="sm">{group.semester} сем.</Badge>
                          </Group>
                          <Table verticalSpacing="xs" horizontalSpacing="xs">
                            <Table.Tbody>
                              {group.items.map((rec: any) => (
                                <Table.Tr key={rec.id}>
                                  <Table.Td style={{ paddingLeft: 0 }}>
                                    <Text size="xs" fw={500}>{rec.assessmentName || 'Контрольний захід'}</Text>
                                  </Table.Td>
                                  <Table.Td w={80} ta="right">
                                    <Text fw={800} size="sm" c={rec.gradeValue >= 90 ? 'teal.7' : rec.gradeValue >= 60 ? 'brand.7' : 'red.7'}>
                                      {rec.gradeValue}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td w={120} ta="right">
                                    <Text size="xs" c="dimmed">{new Date(rec.dateRecorded).toLocaleDateString()}</Text>
                                  </Table.Td>
                                  <Table.Td w={70} style={{ paddingRight: 0 }}>
                                    <Group gap={4} justify="flex-end" wrap="nowrap">
                                      <ActionIcon variant="subtle" color="brand" size="sm" radius="md" onClick={() => handleEditRecord(rec)} title="Редагувати">
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                      <ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => handleDeleteRecord(rec.id)} title="Видалити">
                                        <IconTrash size={14} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </Paper>
                      ))}
                    </Stack>
                  );
                })()
              )}
            </Box>
          </Stack>
        )}
      </Drawer>

      <Modal opened={manualOpened} onClose={handleCloseManual} title="Внести індивідуальну оцінку" centered size="md">
        <form onSubmit={manualForm.onSubmit(handleManualSubmit)}>
          <Stack gap="md">
            <Select
              label="Група"
              placeholder="Оберіть групу"
              data={groupsData}
              searchable
              value={modalGroupId}
              onChange={(val) => {
                setModalGroupId(val || '');
                manualForm.setFieldValue('studentId', '');
              }}
            />
            <Select
              label="Студент"
              placeholder={modalGroupId ? "Оберіть студента" : "Спочатку оберіть групу"}
              data={modalStudents}
              searchable
              disabled={!modalGroupId}
              required
              {...manualForm.getInputProps('studentId')}
            />
            <Select
              label="Дисципліна"
              placeholder="Оберіть предмет"
              data={coursesData}
              searchable
              required
              {...manualForm.getInputProps('courseId')}
            />
            <NumberInput label="Бал (0-100)" min={0} max={100} required {...manualForm.getInputProps('gradeValue')} />
            <TextInput label="Вид контролю" placeholder="Наприклад: Екзамен" {...manualForm.getInputProps('assessmentName')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseManual}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={importOpened} onClose={closeImport} title="Масовий імпорт оцінок" centered size="lg">
        <Stack gap="md">
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-brand-light)">
            <Text fw={700} size="sm" mb="xs">Інструкція:</Text>
            <Text size="xs" mb={4}>• Колонки: <b>Email, Course</b> (Назва або ID), <b>GradeValue</b> (0-100)</Text>
            <Text size="xs" mb={4}>• Додатково: <b>Semester</b> (1-12), <b>Assessment</b> (Вид контролю)</Text>
            <Text size="xs" c="brand" fw={600}>• Якщо оцінка для студента з цього предмету вже існує, вона буде оновлена.</Text>
          </Paper>

          <FileInput
            label="Оберіть файл для оцінок"
            placeholder="Файл не обрано"
            accept=".xlsx,.xls,.csv,.json"
            leftSection={<IconUpload size={14} />}
            onChange={handleBulkUpload}
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
            <Paper p="md" bg="gray.0" withBorder radius="md">
              <Stack gap="xs">
                <Text fw={700} size="sm">Результати:</Text>
                <Group gap="xl">
                  <Text size="sm">Всього: <b>{importResults.total}</b></Text>
                  <Text size="sm" c="teal">Успішно: <b>{importResults.success}</b></Text>
                  <Text size="sm" c="red">Помилок: <b>{importResults.failed}</b></Text>
                </Group>
                {importResults.errors.length > 0 && (
                  <ScrollArea.Autosize mah={150} mt="xs">
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

      <Modal opened={editModalOpened} onClose={closeEditModal} title="Редагувати оцінку" centered size="md">
        <form onSubmit={editForm.onSubmit(handleSaveEdit)}>
          <Stack gap="md">
            <NumberInput label="Бал (0-100)" min={0} max={100} required {...editForm.getInputProps('gradeValue')} />
            <TextInput label="Вид контролю" placeholder="Наприклад: Екзамен" {...editForm.getInputProps('assessmentName')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeEditModal}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};

export default GradeManagement;

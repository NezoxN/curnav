import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Paper, Table, Button, Group, TextInput, NumberInput, Select, Stack, Badge, Text, ScrollArea, Divider, Box, FileInput, Avatar, Modal, Grid, Collapse, Accordion, Center, Drawer, UnstyledButton, SimpleGrid, ActionIcon, ThemeIcon, Pagination } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconUpload, IconSearch, IconAlertCircle, IconFilter, IconChevronDown, IconChevronUp, IconBooks, IconHierarchy, IconArrowLeft, IconArrowNarrowRight, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { parseImportFile, mapImportData } from '../../utils/import.utils';
import apiClient from '../../api/apiClient';
import { zodResolver, gradeManualSchema, gradeEditSchema } from '@/utils/validation';

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

const GradeManagement: React.FC = () => {
  const [manualOpened, { open: openManual, close: closeManual }] = useDisclosure(false);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedStudentInDrawer, setSelectedStudentInDrawer] = useState<any>(null);

  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [studentsData, setStudentsData] = useState<{ value: string, label: string }[]>([]);
  const [coursesData, setCoursesData] = useState<{ value: string, label: string }[]>([]);
  const [groupsData, setGroupsData] = useState<{ value: string, label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [openedFilters, { toggle: toggleFilters }] = useDisclosure(false);
  const [educationalPrograms, setEducationalPrograms] = useState<any[]>([]);
  const [filterProgram, setFilterProgram] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState<string | number>('');
  const [minGrade] = useState<string | number>('');
  const [maxGrade] = useState<string | number>('');

  const [uploadLoading, setUploadLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  const [activeLevel1Id, setActiveLevel1Id] = useState<string | null>(null);

  const manualForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      studentId: '',
      courseId: '',
      gradeValue: 60,
      semesterCompleted: 1,
      assessmentName: '',
    },
    validate: zodResolver(gradeManualSchema),
  });

  const editForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      id: '',
      gradeValue: 60,
      semesterCompleted: 1,
      assessmentName: '',
    },
    validate: zodResolver(gradeEditSchema),
  });
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  const groupedRecords = useMemo(() => {
    const l1Groups: Record<string, {
      label: string,
      items: AcademicRecord[],
      secondary?: string,
      children: Record<string, {
        id: string,
        label: string,
        items: AcademicRecord[],
        students: Record<string, { id: string, label: string, subLabel: string, records: AcademicRecord[] }>
      }>
    }> = {};

    records.forEach(rec => {
      let l1Key, l1Label, l1Secondary;
      let l2Key, l2Label;
      let sKey;

      l1Key = rec.student?.group?.name || 'unknown';
      l1Label = `Група ${l1Key}`;
      l1Secondary = '';
      l2Key = rec.course?.id || 'unknown';
      l2Label = rec.course?.name || 'Невідома дисципліна';

      sKey = rec.student?.id || 'unknown';

      if (!l1Groups[l1Key]) {
        l1Groups[l1Key] = { label: l1Label, secondary: l1Secondary, items: [], children: {} };
      }
      l1Groups[l1Key].items.push(rec);

      if (!l1Groups[l1Key].children[l2Key]) {
        l1Groups[l1Key].children[l2Key] = { id: l2Key, label: l2Label, items: [], students: {} };
      }
      l1Groups[l1Key].children[l2Key].items.push(rec);

      if (!l1Groups[l1Key].children[l2Key].students[sKey]) {
        l1Groups[l1Key].children[l2Key].students[sKey] = {
          id: sKey,
          label: rec.student?.fullName || 'Невідомий',
          subLabel: rec.student?.user?.email || '',
          records: []
        };
      }
      l1Groups[l1Key].children[l2Key].students[sKey].records.push(rec);
    });

    return Object.entries(l1Groups).map(([id, data]) => ({
      id,
      ...data,
      children: Object.values(data.children).map(c => ({
        ...c,
        studentList: Object.values(c.students).sort((a, b) => a.label.localeCompare(b.label))
      })).sort((a, b) => a.label.localeCompare(b.label))
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [records]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, stuRes, couRes, grpRes, specRes] = await Promise.all([
        apiClient.get('/admin/records', {
          params: {
            search: search || undefined,
            groupId: filterGroup || undefined,
            educationalProgramId: filterProgram || undefined,
            courseId: filterCourse || undefined,
            semester: filterSemester || undefined,
            minGrade: minGrade || undefined,
            maxGrade: maxGrade || undefined,
            page: pagination.page,
            limit: 100
          }
        }),
        apiClient.get('/admin/students', { params: { limit: 1000 } }),
        apiClient.get('/admin/courses'),
        apiClient.get('/admin/groups'),
        apiClient.get('/admin/educational-programs')
      ]);

      setRecords(recRes.data.data.records);
      if (recRes.data.data.pagination) {
        setPagination(prev => ({ ...prev, totalPages: recRes.data.data.pagination.totalPages }));
      }
      setStudentsData(stuRes.data.data.students.map((s: any) => ({
        value: s.id,
        label: `${s.fullName} (${s.group?.name || '?'})`
      })));
      setCoursesData(couRes.data.data.courses.map((c: any) => ({ value: c.id, label: c.name })));
      setGroupsData(grpRes.data.data.map((g: any) => ({ value: g.id, label: g.name })));
      setEducationalPrograms(specRes.data.data);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [search, filterGroup, filterProgram, filterCourse, filterSemester, minGrade, maxGrade]);

  useEffect(() => {
    fetchData();
  }, [fetchData, pagination.page]);

  const activeFiltersCount = [filterGroup, filterProgram, filterCourse, filterSemester, search, minGrade].filter(Boolean).length;

  const handleManualSubmit = async (values: typeof manualForm.values) => {
    try {
      await apiClient.post('/admin/records', values);
      notifications.show({ title: 'Успіх', message: 'Оцінку збережено', color: 'teal' });
      manualForm.reset();
      closeManual();
      fetchData();
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося зберегти оцінку', color: 'red' });
    }
  };

  const handleEditRecord = (record: AcademicRecord) => {
    editForm.setValues({
      id: record.id,
      gradeValue: record.gradeValue,
      semesterCompleted: record.semesterCompleted,
      assessmentName: record.assessmentName || '',
    });
    openEditModal();
  };

  const handleSaveEdit = async (values: typeof editForm.values) => {
    try {
      await apiClient.put(`/admin/records/${values.id}`, values);
      notifications.show({ title: 'Успіх', message: 'Оцінку оновлено', color: 'teal' });
      closeEditModal();
      fetchData();


      if (selectedStudentInDrawer) {
        setSelectedStudentInDrawer({
          ...selectedStudentInDrawer,
          records: selectedStudentInDrawer.records.map((r: any) => r.id === values.id ? { ...r, ...values } : r)
        });
      }
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося оновити оцінку', color: 'red' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю оцінку?')) return;
    try {
      await apiClient.delete(`/admin/records/${id}`);
      notifications.show({ title: 'Виконано', message: 'Оцінку видалено', color: 'teal' });
      fetchData();


      if (selectedStudentInDrawer) {
        setSelectedStudentInDrawer({
          ...selectedStudentInDrawer,
          records: selectedStudentInDrawer.records.filter((r: any) => r.id !== id)
        });
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
      const rawData = await parseImportFile(file);

      const gradeMapping = {
        email: ['email', 'Email', 'Електронна пошта', 'Пошта'],
        course: ['course', 'Course', 'course_id', 'CourseID', 'Дисципліна', 'Предмет'],
        gradeValue: ['grade', 'Grade', 'gradeValue', 'Оцінка', 'Бал'],
        semester: ['semester', 'Semester', 'Семестр'],
        assessment: ['assessment', 'Assessment', 'Атестація', 'Вид контролю']
      };

      const records = mapImportData(rawData, gradeMapping)
        .filter(r => r.email && r.course && !isNaN(Number(r.gradeValue)));

      if (records.length === 0) {
        throw new Error('У файлі не знайдено коректних даних для імпорту');
      }

      const res = await apiClient.post('/admin/records/bulk', { records });
      setImportResults(res.data.data);
      notifications.show({
        title: 'Успіх',
        message: `Імпорт завершено: ${res.data.data.success} записів додано`,
        color: 'teal'
      });
      fetchData();
    } catch (err: any) {
      notifications.show({ title: 'Помилка', message: err.message || 'Імпорт не вдався', color: 'red' });
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
            placeholder="Швидкий пошук (Дисципліна, Група, Студент)..."
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
                  data={['1', '2', '3', '4', '5', '6', '7', '8']}
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
                {groupedRecords.filter(l => l.label.toLowerCase().includes(search.toLowerCase())).map((l1) => {
                  const l1Avg = l1.items.length > 0 ? l1.items.reduce((acc, curr) => acc + curr.gradeValue, 0) / l1.items.length : 0;
                  const gradeColor = l1Avg >= 90 ? 'teal' : l1Avg >= 75 ? 'blue' : l1Avg >= 60 ? 'brand' : 'red';

                  return (
                    <UnstyledButton key={l1.id} onClick={() => setActiveLevel1Id(l1.id)} style={{ display: 'flex' }}>
                      <Paper
                        p="xl" radius="md" withBorder
                        style={{ flex: 1, transition: 'transform 0.2s ease', cursor: 'pointer' }}
                      >
                        <Group justify="space-between" mb="xs">
                          <ThemeIcon size="lg" radius="md" variant="light" color={gradeColor}>
                            <IconHierarchy size={20} />
                          </ThemeIcon>

                        </Group>

                        <Box mb="md">
                          <Text fw={800} size="lg" truncate>{l1.label}</Text>
                          <Text size="xs" c="dimmed">Академічна група</Text>
                        </Box>

                        <Divider mb="md" variant="dashed" />

                        <Group justify="flex-end" mt="md">
                          <Text size="xs" fw={700} color={gradeColor} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Переглянути <IconArrowNarrowRight size={14} />
                          </Text>
                        </Group>
                      </Paper>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>

              {groupedRecords.length === 0 && !loading && (
                <Center h={300}>
                  <Stack align="center" gap="sm">
                    <IconAlertCircle size={48} color="gray" />
                    <Text c="dimmed" fw={700}>Даних не знайдено</Text>
                    <Text size="xs" c="dimmed">Спробуйте змінити фільтри або критерії пошуку</Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          )}

          {activeLevel1Id && (
            <Stack gap="xl">
              {(() => {
                const selectedL1 = groupedRecords.find(r => r.id === activeLevel1Id);
                if (!selectedL1) return null;

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
                          <Text size="xl" fw={800}>{selectedL1.label}</Text>
                          <Text size="xs" c="dimmed">Аналітика успішності за рівнем групи</Text>
                        </Box>
                      </Group>
                    </Group>

                    <ScrollArea h={600}>
                      <Accordion variant="separated" radius="md">
                        {selectedL1.children.map((l2) => {
                          const l2Avg = l2.items.length > 0 ? l2.items.reduce((acc, curr) => acc + curr.gradeValue, 0) / l2.items.length : 0;
                          const l2Color = l2Avg >= 90 ? 'teal' : l2Avg >= 75 ? 'blue' : l2Avg >= 60 ? 'brand' : 'red';

                          return (
                            <Accordion.Item key={l2.id} value={l2.id} mb="sm">
                              <Accordion.Control>
                                <Group justify="space-between" pr="md">
                                  <Group gap="sm">
                                    <ThemeIcon size="md" radius="md" variant="light" color={l2Color}>
                                      <IconBooks size={18} />
                                    </ThemeIcon>
                                    <Box>
                                      <Text fw={700} fz="md">{l2.label}</Text>
                                    </Box>
                                  </Group>
                                </Group>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                  {l2.studentList.map((student) => {
                                    const avg = student.records.length > 0 ? (student.records.reduce((a, b) => a + b.gradeValue, 0) / student.records.length).toFixed(0) : '0';
                                    const sColor = parseInt(avg) >= 90 ? 'teal' : parseInt(avg) >= 60 ? 'brand' : 'red';
                                    return (
                                      <UnstyledButton
                                        key={student.id}
                                        onClick={() => {
                                          setSelectedStudentInDrawer({ ...student, contextLabel: selectedL1.label, groupLabel: l2.label });
                                          openDrawer();
                                        }}
                                      >
                                        <Paper p="sm" radius="md" withBorder style={{ background: 'var(--mantine-color-gray-0)', border: '1px solid var(--mantine-color-gray-1)' }}>
                                          <Group justify="space-between" wrap="nowrap">
                                            <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                              <Avatar color={sColor} radius="xl" size="sm">
                                                {student.label.charAt(0)}
                                              </Avatar>
                                              <Box style={{ flex: 1, minWidth: 0 }}>
                                                <Text size="sm" fw={700} truncate>{student.label}</Text>
                                                <Text size="10px" c="dimmed" truncate>{student.subLabel}</Text>
                                              </Box>
                                            </Group>
                                          </Group>
                                        </Paper>
                                      </UnstyledButton>
                                    );
                                  })}
                                </SimpleGrid>
                              </Accordion.Panel>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    </ScrollArea>
                  </>
                );
              })()}

              {pagination.totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination
                    total={pagination.totalPages}
                    value={pagination.page}
                    onChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
                    color="brand"
                    radius="md"
                  />
                </Group>
              )}
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
                    <Badge variant="light" color="blue">{selectedStudentInDrawer.groupLabel}</Badge>
                  </Group>
                </Box>
              </Group>
            </Paper>

            <Box>
              <Group justify="space-between" mb="xs">
                <Text fw={700}>Історія оцінювання</Text>
              </Group>

              <Paper p={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
                <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
                  <Table.Thead bg="light-dark(gray.0, dark.6)">
                    <Table.Tr>
                      <Table.Th>Дисципліна</Table.Th>
                      <Table.Th w={80}>Сем.</Table.Th>
                      <Table.Th w={100}>Оцінка</Table.Th>
                      <Table.Th w={140}>Дата</Table.Th>
                      <Table.Th w={80}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedStudentInDrawer.records.map((rec: any) => (
                      <Table.Tr key={rec.id}>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm" fw={700}>{rec.course?.name}</Text>
                            <Text size="xs" c="dimmed">{rec.assessmentName || 'Контроль'}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="dot" color="gray" size="sm">{rec.semesterCompleted} сем.</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={900} size="lg" c={rec.gradeValue >= 90 ? 'teal.7' : rec.gradeValue >= 60 ? 'brand.7' : 'red.7'}>
                            {rec.gradeValue}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{new Date(rec.dateRecorded).toLocaleDateString()}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6} wrap="nowrap" justify="flex-end">
                            <ActionIcon variant="subtle" color="brand" radius="md" onClick={() => handleEditRecord(rec)} title="Редагувати">
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" radius="md" onClick={() => handleDeleteRecord(rec.id)} title="Видалити">
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Box>
          </Stack>
        )}
      </Drawer>


      <Modal opened={manualOpened} onClose={closeManual} title="Внести індивідуальну оцінку" centered size="md">
        <form onSubmit={manualForm.onSubmit(handleManualSubmit)}>
          <Stack gap="md">
            <Select
              label="Студент"
              placeholder="Оберіть студента"
              data={studentsData}
              searchable
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
            <Group grow>
              <NumberInput label="Бал (0-100)" min={0} max={100} required {...manualForm.getInputProps('gradeValue')} />
              <NumberInput label="Семестр" min={1} max={12} required {...manualForm.getInputProps('semesterCompleted')} />
            </Group>
            <TextInput label="Вид контролю" placeholder="Наприклад: Екзамен" {...manualForm.getInputProps('assessmentName')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeManual}>Скасувати</Button>
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
            <Group grow>
              <NumberInput label="Бал (0-100)" min={0} max={100} required {...editForm.getInputProps('gradeValue')} />
              <NumberInput label="Семестр" min={1} max={12} required {...editForm.getInputProps('semesterCompleted')} />
            </Group>
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

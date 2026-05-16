import React, { useEffect, useState } from 'react';
import { Paper, Table, Button, Group, ActionIcon, Modal, TextInput, NumberInput, MultiSelect, Select, Stack, Badge, Tabs, Text, FileInput, Divider, List, Box, Grid, Collapse, Tooltip, ScrollArea, Pagination } from '@mantine/core';
import { parseImportFile, mapImportData } from '../../utils/import.utils';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash, IconLink, IconUpload, IconSearch, IconX, IconFilter, IconChevronDown, IconChevronUp, IconBooks, IconHierarchy, IconTags, IconCertificate } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import apiClient from '../../api/apiClient';
import { zodResolver, programSchema, courseSchema, categorySchema, dependencySchema } from '@/utils/validation';

interface Dependency {
  id: string;
  parentCourseId: string;
  childCourseId: string;
  weight: number;
  parentCourse?: Course;
  childCourse?: Course;
}

interface Course {
  id: string;
  name: string;
  ectsCredits: number;
  controlType: string;
  semester: number | null;
  categoryId: string | null;
  educationalProgramLinks: { educationalProgramId: string; educationalProgram: { name: string } }[];
  category?: { name: string };
  parentDependencies: Dependency[];
  childDependencies: Dependency[];
  isSelective: boolean;
  maxStudents?: number | null;
  enrolledCount?: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const CourseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [educationalPrograms, setEducationalPrograms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterControl, setFilterControl] = useState<string | null>(null);
  const [filterProgram, setFilterProgram] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const [opened, { open, close }] = useDisclosure(false);
  const [catOpened, { open: openCat, close: closeCat }] = useDisclosure(false);
  const [programOpened, { open: openProgram, close: closeProgram }] = useDisclosure(false);
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  const [depOpened, { open: openDep, close: closeDep }] = useDisclosure(false);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | 'other' | null>(1);
  const [selectedCourseForDep, setSelectedCourseForDep] = useState<Course | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [specImportOpened, { open: openSpecImport, close: closeSpecImport }] = useDisclosure(false);
  const [specImportResults, setSpecImportResults] = useState<ImportResults | null>(null);

  interface ImportResults {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }

  const programForm = useForm({
    validateInputOnChange: true,
    initialValues: { name: '', description: '', totalCredits: 240, maxCreditsPerSem: 30 },
    validate: zodResolver(programSchema),
  });

  const courseForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      name: '',
      ectsCredits: 5,
      controlType: 'Екзамен',
      semester: undefined as number | undefined,
      educationalProgramIds: [] as string[],
      categoryId: null as string | null,
      isSelective: false,
      maxStudents: null as number | null,
    },
    validate: zodResolver(courseSchema),
  });

  const catForm = useForm({
    validateInputOnChange: true,
    initialValues: { name: '', description: '' },
    validate: zodResolver(categorySchema),
  });

  const depForm = useForm({
    validateInputOnChange: true,
    initialValues: { parentCourseId: '', weight: 1.0 },
    validate: zodResolver(dependencySchema),
  });

  const [openedFilters, { toggle: toggleFilters }] = useDisclosure(false);

  const fetchData = async (page = 1) => {
    try {
      const [coursesRes, catsRes, programsRes] = await Promise.all([
        apiClient.get('/admin/courses', {
          params: {
            search: search || undefined,
            categoryId: filterCategory || undefined,
            semester: selectedSemester && selectedSemester !== 'other' ? selectedSemester : undefined,
            controlType: filterControl || undefined,
            educationalProgramId: filterProgram || undefined,
            isSelective: filterType === 'selective' ? true : filterType === 'compulsory' ? false : undefined,
            page,
            limit: 20
          }
        }),
        apiClient.get('/categories'),
        apiClient.get('/admin/educational-programs'),
      ]);
      setCourses(coursesRes.data.data.courses);
      setPagination(coursesRes.data.data.pagination);
      setCategories(catsRes.data.data);
      setEducationalPrograms(programsRes.data.data);
    } catch (error) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані', color: 'red' });
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [search, filterCategory, filterControl, filterProgram, selectedSemester, filterType]);

  const activeFiltersCount = [filterCategory, filterControl, filterProgram, search, selectedSemester !== null ? 'sem' : null, filterType].filter(Boolean).length;

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    courseForm.setValues({
      name: course.name,
      ectsCredits: course.ectsCredits,
      controlType: course.controlType,
      semester: course.semester || undefined,
      educationalProgramIds: course.educationalProgramLinks?.map((sl: any) => sl.educationalProgramId) || [],
      categoryId: course.categoryId,
      isSelective: course.isSelective || false,
      maxStudents: course.maxStudents || null,
    });
    open();
  };

  const handleSaveCourse = async (values: typeof courseForm.values) => {
    try {
      if (editingCourse) {
        await apiClient.put(`/admin/courses/${editingCourse.id}`, values);
      } else {
        await apiClient.post('/admin/courses', values);
      }
      notifications.show({ title: 'Успіх', message: 'Зміни збережено', color: 'teal' });
      close();
      fetchData(pagination.page);
    } catch {
      notifications.show({ title: 'Помилка', message: 'Збереження не вдалося', color: 'red' });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Видалити цей курс?')) return;
    try {
      await apiClient.delete(`/admin/courses/${id}`);
      fetchData(pagination.page);
    } catch {
      notifications.show({ title: 'Помилка', message: 'Видалення не вдалося', color: 'red' });
    }
  };

  const handleEditCat = (cat: Category) => {
    setEditingCategory(cat);
    catForm.setValues({ name: cat.name, description: cat.description || '' });
    openCat();
  };

  const handleEditProgram = (prog: any) => {
    setEditingProgram(prog);
    programForm.setValues({
      name: prog.name,
      description: prog.description || '',
      totalCredits: prog.totalCredits || 240,
      maxCreditsPerSem: prog.maxCreditsPerSem || 30
    });
    openProgram();
  };

  const handleSaveProgram = async (values: typeof programForm.values) => {
    try {
      if (editingProgram) {
        await apiClient.put(`/admin/educational-programs/${editingProgram.id}`, values);
      } else {
        await apiClient.post('/admin/educational-programs', values);
      }
      closeProgram();
      fetchData();
    } catch {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const handleSaveCat = async (values: typeof catForm.values) => {
    try {
      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}`, values);
      } else {
        await apiClient.post('/categories', values);
      }
      closeCat();
      fetchData();
    } catch {
      notifications.show({ title: 'Помилка', message: 'Дія не вдалася', color: 'red' });
    }
  };

  const openDependencies = (course: Course) => {
    setSelectedCourseForDep(course);
    depForm.reset();
    openDep();
  };

  const handleAddDependency = async (values: typeof depForm.values) => {
    if (!selectedCourseForDep) return;
    try {
      await apiClient.post('/admin/courses/dependencies', {
        parentCourseId: values.parentCourseId,
        childCourseId: selectedCourseForDep.id,
        weight: values.weight
      });
      notifications.show({ title: 'Успіх', message: 'Звʼязок додано', color: 'teal' });
      fetchData();
      const res = await apiClient.get('/admin/courses');
      const updated = res.data.data.courses.find((c: any) => c.id === selectedCourseForDep.id);
      setSelectedCourseForDep(updated);
      depForm.reset();
    } catch (error: any) {
      notifications.show({
        title: 'Помилка',
        message: error.response?.data?.message || 'Не вдалося додати звʼязок',
        color: 'red'
      });
    }
  };

  const handleRemoveDependency = async (id: string) => {
    try {
      await apiClient.delete(`/admin/courses/dependencies/${id}`);
      fetchData();
      const res = await apiClient.get('/admin/courses');
      const updated = res.data.data.courses.find((c: any) => c.id === selectedCourseForDep?.id);
      setSelectedCourseForDep(updated);
    } catch {
      notifications.show({ title: 'Помилка', message: 'Не вдалося видалити звʼязок', color: 'red' });
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setUploadLoading(true);
    try {
      const rawData = await parseImportFile(file);

      const courseMapping = {
        name: ['name', 'Name', 'Назва', 'Дисципліна', 'Предмет'],
        description: ['description', 'Description', 'Опис', 'Примітка'],
        ectsCredits: ['ectsCredits', 'credits', 'ECTS', 'Кредити', 'Кількість кредитів'],
        semester: ['semester', 'Semester', 'Семестр', 'Півріччя'],
        categoryName: ['category', 'Category', 'Категорія', 'Група дисциплін'],
        isSelective: ['isSelective', 'selective', 'type', 'Type', 'Тип', 'Вибіркова', 'Статус'],
        educationalProgramNames: ['programs', 'Educational Programs', 'Освітні програми', 'Програми', 'ОП'],
        prerequisiteNames: ['prerequisites', 'Prerequisites', 'Пререквізити', 'Звʼязки', 'Залежить від']
      };

      const courses = mapImportData(rawData, courseMapping)
        .filter(c => c.name)
        .map(c => ({
          ...c,
          ectsCredits: Number(c.ectsCredits || 0),
          semester: Number(c.semester || 1),
          isSelective: typeof c.isSelective === 'string'
            ? c.isSelective.toLowerCase().includes('вибірк') || c.isSelective.toLowerCase() === 'true'
            : !!c.isSelective,
          educationalProgramNames: typeof c.educationalProgramNames === 'string'
            ? c.educationalProgramNames.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(c.educationalProgramNames) ? c.educationalProgramNames : [],
          prerequisiteNames: typeof c.prerequisiteNames === 'string'
            ? c.prerequisiteNames.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(c.prerequisiteNames) ? c.prerequisiteNames : []
        }));

      if (courses.length === 0) {
        throw new Error('У файлі не знайдено коректних даних для імпорту');
      }

      const res = await apiClient.post('/admin/courses/import', { courses });
      setImportResults(res.data.data);
      notifications.show({ title: 'Успіх', message: `Оброблено курсів: ${res.data.data.total}`, color: 'teal' });
      fetchData();
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.message || 'Імпорт не вдався', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSpecImport = async (file: File | null) => {
    if (!file) return;
    setUploadLoading(true);
    setSpecImportResults(null);
    try {
      const rawData = await parseImportFile(file);
      const specMapping = {
        name: ['name', 'Name', 'Назва', 'Освітня програма', 'ОП'],
        totalCredits: ['credits', 'totalCredits', 'ECTS', 'Кредити'],
        description: ['description', 'Description', 'Опис']
      };

      const educationalPrograms = mapImportData(rawData, specMapping).filter(s => s.name);

      if (educationalPrograms.length === 0) {
        throw new Error('У файлі не знайдено коректних даних для імпорту програм');
      }

      const res = await apiClient.post('/admin/educational-programs/import', { educationalPrograms });
      setSpecImportResults(res.data.data);
      notifications.show({ title: 'Успіх', message: `Оброблено програм: ${res.data.data.total}`, color: 'teal' });
      fetchData();
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.message || 'Імпорт не вдався', color: 'red' });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Box>
          <Text size="xl" fw={800} className="premium-text-gradient">Освітній контент</Text>
          <Text size="xs" c="dimmed">Керування навчальними планами, дисциплінами та академічними групами</Text>
        </Box>


        <Tabs value={activeTab} onChange={setActiveTab} color="brand" variant="pills" radius="md">
          <Tabs.List p={4} mb="xl" style={{ display: 'inline-flex' }}>
            <Tabs.Tab value="courses" px="xl">Дисципліни</Tabs.Tab>
            <Tabs.Tab value="categories" px="xl">Категорії</Tabs.Tab>
            <Tabs.Tab value="programs" px="xl">Освітні програми</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="courses">
            <Stack gap="xl">
              <Group justify="space-between" wrap="wrap">
                <TextInput
                  placeholder="Пошук дисципліни або коду..."
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
                  <Button size="md" leftSection={<IconPlus size={18} />} onClick={() => { setEditingCourse(null); courseForm.reset(); open(); }} color="brand" radius="md">
                    Додати дисципліну
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
                        value={filterProgram}
                        onChange={setFilterProgram}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Select
                        label="Категорія"
                        placeholder="Всі категорії"
                        data={categories.map(c => ({ value: c.id, label: c.name }))}
                        clearable
                        searchable
                        radius="md"
                        value={filterCategory}
                        onChange={setFilterCategory}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Select
                        label="Контроль"
                        placeholder="Всі види"
                        data={['Екзамен', 'Залік', 'Диф. залік']}
                        clearable
                        radius="md"
                        value={filterControl}
                        onChange={setFilterControl}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Select
                        label="Семестр"
                        placeholder="Всі семестри"
                        data={[
                          { value: '1', label: '1 семестр' },
                          { value: '2', label: '2 семестр' },
                          { value: '3', label: '3 семестр' },
                          { value: '4', label: '4 семестр' },
                          { value: '5', label: '5 семестр' },
                          { value: '6', label: '6 семестр' },
                          { value: '7', label: '7 семестр' },
                          { value: '8', label: '8 семестр' },
                          { value: '9', label: '9 семестр' },
                          { value: '10', label: '10 семестр' },
                          { value: '11', label: '11 семестр' },
                          { value: '12', label: '12 семестр' },
                          { value: 'other', label: 'Інші / Вибіркові' }
                        ]}
                        clearable
                        radius="md"
                        value={selectedSemester?.toString() || null}
                        onChange={(val) => setSelectedSemester(val === 'other' ? 'other' : (val ? Number(val) : null))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Select
                        label="Тип дисципліни"
                        placeholder="Всі типи"
                        data={[
                          { value: 'compulsory', label: 'Обовʼязкові' },
                          { value: 'selective', label: 'Вибіркові' }
                        ]}
                        clearable
                        radius="md"
                        value={filterType}
                        onChange={setFilterType}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Collapse>

              <Stack gap="md">

                <Paper p="xl" withBorder>
                  <ScrollArea>
                    <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 800 }}>
                      <Table.Thead bg="light-dark(gray.0, dark.6)">
                        <Table.Tr>
                          <Table.Th><Group gap={4}><IconBooks size={16} /> Назва</Group></Table.Th>
                          <Table.Th><Group gap={4}><IconTags size={16} /> Категорія</Group></Table.Th>
                          <Table.Th><Group gap={4}><IconCertificate size={16} /> Кредити</Group></Table.Th>
                          <Table.Th>Тип</Table.Th>
                          <Table.Th>Місць</Table.Th>
                          <Table.Th><Group gap={4}><IconHierarchy size={16} /> Звʼязки</Group></Table.Th>
                          <Table.Th style={{ width: 140 }} ta="right">Дії</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {courses.map((course) => (
                          <Table.Tr key={course.id}>
                            <Table.Td>
                              <Box>
                                <Text fw={600} size="sm" mb={2}>{course.name}</Text>
                              </Box>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" color="brand" radius="sm">
                                {course.category?.name || 'Без категорії'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4}>
                                <Text fw={700} size="sm" c="brand.7">{course.ectsCredits}</Text>
                                <Text size="xs" c="dimmed">ECTS</Text>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              {course.isSelective ? (
                                <Badge variant="light" color="orange" size="sm">Вибіркова</Badge>
                              ) : (
                                <Badge variant="light" color="blue" size="sm">Обовʼязкова</Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {course.maxStudents ? (
                                <Text size="sm">{course.enrolledCount || 0} / {course.maxStudents}</Text>
                              ) : (
                                <Text size="sm" c="dimmed">Безліміт</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                variant="dot"
                                color={course.childDependencies.length > 0 ? 'orange' : 'gray'}
                                size="sm"
                              >
                                {course.childDependencies.length} пререквізитів
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4} wrap="nowrap" justify="flex-end">
                                <Tooltip label="Керувати звʼязками">
                                  <ActionIcon onClick={() => openDependencies(course)} variant="subtle" color="brand" radius="md">
                                    <IconLink size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Редагувати">
                                  <ActionIcon onClick={() => handleEditCourse(course)} variant="subtle" color="brand" radius="md">
                                    <IconEdit size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Видалити">
                                  <ActionIcon onClick={() => handleDeleteCourse(course.id)} variant="subtle" color="red" radius="md">
                                    <IconTrash size={18} />
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

                {pagination.totalPages > 1 && (
                  <Group justify="center" mt="md">
                    <Pagination
                      total={pagination.totalPages}
                      value={pagination.page}
                      onChange={fetchData}
                      color="brand"
                      radius="md"
                    />
                  </Group>
                )}
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="categories">
            <Paper p="xl" withBorder>
              <Group justify="space-between" mb="xl">
                <Text fw={600}>Перелік категорій</Text>
                <Button size="md" variant="light" color="brand" radius="md" leftSection={<IconPlus size={18} />} onClick={() => { setEditingCategory(null); catForm.reset(); openCat(); }}>
                  Додати категорію
                </Button>
              </Group>
              <ScrollArea>
                <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 600 }}>
                  <Table.Thead bg="light-dark(gray.0, dark.6)">
                    <Table.Tr>
                      <Table.Th>Назва</Table.Th>
                      <Table.Th>Опис</Table.Th>
                      <Table.Th style={{ width: 100 }}>Дії</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {categories.map((cat) => (
                      <Table.Tr key={cat.id}>
                        <Table.Td fw={600}>{cat.name}</Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{cat.description || '-'}</Text></Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="light" color="brand" radius="md" size="md" onClick={() => handleEditCat(cat)}><IconEdit size={14} /></ActionIcon>
                            <ActionIcon variant="light" color="red" radius="md" size="md" onClick={async () => { if (window.confirm('Видалити?')) { await apiClient.delete(`/categories/${cat.id}`); fetchData(); } }}><IconTrash size={14} /></ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Tabs.Panel>
          <Tabs.Panel value="programs">
            <Paper p="xl" withBorder>
              <Group justify="space-between" mb="xl">
                <Text fw={600}>Перелік освітніх програм</Text>
                <Group>
                  <Button size="md" variant="light" color="brand" radius="md" leftSection={<IconUpload size={18} />} onClick={openSpecImport}>
                    Імпорт програм
                  </Button>
                  <Button size="md" variant="light" color="brand" radius="md" leftSection={<IconPlus size={18} />} onClick={() => { setEditingProgram(null); programForm.reset(); openProgram(); }}>
                    Додати програму
                  </Button>
                </Group>
              </Group>
              <ScrollArea>
                <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover style={{ minWidth: 600 }}>
                  <Table.Thead bg="light-dark(gray.0, dark.6)">
                    <Table.Tr>
                      <Table.Th>Назва</Table.Th>
                      <Table.Th>Кредитів (всього)</Table.Th>
                      <Table.Th>Кредитів (на сем.)</Table.Th>
                      <Table.Th>Опис</Table.Th>
                      <Table.Th style={{ width: 100 }}>Дії</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {educationalPrograms.map((prog) => (
                      <Table.Tr key={prog.id}>
                        <Table.Td fw={600}>{prog.name}</Table.Td>
                        <Table.Td>{prog.totalCredits}</Table.Td>
                        <Table.Td>{prog.maxCreditsPerSem}</Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{prog.description || '-'}</Text></Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end">
                            <ActionIcon variant="light" color="brand" radius="md" size="md" onClick={() => handleEditProgram(prog)}><IconEdit size={14} /></ActionIcon>
                            <ActionIcon variant="light" color="red" radius="md" size="md" onClick={async () => { if (window.confirm('Ви впевнені?')) { await apiClient.delete(`/admin/educational-programs/${prog.id}`); fetchData(); } }}><IconTrash size={14} /></ActionIcon>
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
      </Stack>


      <Modal opened={opened} onClose={close} title={editingCourse ? 'Редагувати дисципліну' : 'Нова дисципліну'} centered size="lg">
        <form onSubmit={courseForm.onSubmit(handleSaveCourse)}>
          <Stack gap="md">
            <TextInput label="Назва" required {...courseForm.getInputProps('name')} />
            <Group grow>
              <NumberInput label="Кредити ECTS" min={1} max={30} {...courseForm.getInputProps('ectsCredits')} />
              <Select label="Тип контролю" data={['Екзамен', 'Залік', 'Диф. залік']} {...courseForm.getInputProps('controlType')} />
            </Group>
            <Group grow>
              <Select label="Категорія" data={categories.map(c => ({ value: c.id, label: c.name }))} searchable clearable {...courseForm.getInputProps('categoryId')} />
              <NumberInput label="Рекомендований семестр (1-12)" min={1} max={12} {...courseForm.getInputProps('semester')} />
            </Group>
            <MultiSelect label="Освітні програми" data={educationalPrograms.map(s => ({ value: s.id, label: s.name }))} searchable clearable {...courseForm.getInputProps('educationalProgramIds')} />

            <Select
              label="Тип дисципліни"
              data={[
                { value: 'false', label: 'Обовʼязкова' },
                { value: 'true', label: 'Вибіркова' }
              ]}
              {...courseForm.getInputProps('isSelective')}
              value={courseForm.values.isSelective.toString()}
              onChange={(v) => courseForm.setFieldValue('isSelective', v === 'true')}
            />
            {courseForm.values.isSelective && (
              <NumberInput
                label="Максимальна кількість місць (необов'язково)"
                min={1}
                {...courseForm.getInputProps('maxStudents')}
                placeholder="Безліміт"
              />
            )}

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={close}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={depOpened} onClose={closeDep} title={`Звʼязки курсу: ${selectedCourseForDep?.name}`} size="lg" centered>
        <Stack gap="md">
          <Paper withBorder p="md" bg="gray.0">
            <Text fw={600} mb="xs">Поточні пререквізити (від яких залежить цей курс):</Text>
            {selectedCourseForDep?.childDependencies.length === 0 ? (
              <Text size="sm" c="dimmed">Звʼязків не встановлено</Text>
            ) : (
              <List spacing="xs" size="sm" withPadding>
                {selectedCourseForDep?.childDependencies.map(dep => (
                  <List.Item key={dep.id}>
                    <Group justify="space-between" gap="xs">
                      <Text component="span">{dep.parentCourse?.name} <Badge size="xs" variant="light">Вага: {dep.weight}</Badge></Text>
                      <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveDependency(dep.id)}>
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  </List.Item>
                ))}
              </List>
            )}
          </Paper>

          <Divider label="Додати новий звʼязок" labelPosition="center" />

          <form onSubmit={depForm.onSubmit(handleAddDependency)}>
            <Stack gap="sm">
              <Select
                label="Оберіть дисципліну-пререквізит"
                placeholder="Пошук..."
                searchable
                data={courses.filter(c => c.id !== selectedCourseForDep?.id).map(c => ({ value: c.id, label: c.name }))}
                required
                {...depForm.getInputProps('parentCourseId')}
              />
              <Group grow align="flex-end">
                <NumberInput
                  label="Вага впливу (0.1 - 1.0)"
                  step={0.1}
                  min={0.1}
                  max={1.0}
                  {...depForm.getInputProps('weight')}
                />
                <Button leftSection={<IconPlus size={16} />} type="submit" color="brand">Додати</Button>
              </Group>
            </Stack>
          </form>

          <Paper withBorder p="md" bg="brand.0">
            <Text size="xs" c="brand.9">
              <b>Примітка:</b> iBKT використовує ці звʼязки для визначення оптимального порядку вивчення.
              Якщо студент не пройшов пререквізит, ймовірність успіху в цьому курсі буде знижена згідно з вагою.
            </Text>
          </Paper>
        </Stack>
      </Modal>

      <Modal opened={programOpened} onClose={closeProgram} title={editingProgram ? 'Редагувати освітню програму' : 'Нова освітня програма'} centered>
        <form onSubmit={programForm.onSubmit(handleSaveProgram)}>
          <Stack gap="md">
            <TextInput label="Назва" required {...programForm.getInputProps('name')} />
            <Group grow>
              <NumberInput label="Загальна кількість кредитів" min={1} max={500} required {...programForm.getInputProps('totalCredits')} />
              <NumberInput label="Кредитів на семестр" min={1} max={60} required {...programForm.getInputProps('maxCreditsPerSem')} />
            </Group>
            <TextInput label="Опис" {...programForm.getInputProps('description')} />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={closeProgram}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={catOpened} onClose={closeCat} title={editingCategory ? 'Редагувати категорію' : 'Нова категорія'} centered>
        <form onSubmit={catForm.onSubmit(handleSaveCat)}>
          <Stack gap="md">
            <TextInput label="Назва" required {...catForm.getInputProps('name')} />
            <TextInput label="Опис" {...catForm.getInputProps('description')} />
            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={closeCat}>Скасувати</Button>
              <Button color="brand" type="submit">Зберегти</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={importOpened} onClose={closeImport} title="Імпорт навчальних дисциплін" centered size="lg">
        <Stack gap="md">
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-brand-light)">
            <Text fw={700} size="sm" mb="xs">Інструкція:</Text>
            <Text size="xs" mb={4}>• Колонки: <b>Назва, Кредити, Категорія, Семестр</b> (1-12)</Text>
            <Text size="xs" mb={4}>• Зв'язки: <b>Освітні програми, Пререквізити</b> (через кому, необов'язково з вагою: <i>Математика:0.8</i>)</Text>
            <Text size="xs" mb={4}>• Додатково: <b>Тип</b> (Вибіркова), <b>Опис</b></Text>
            <Text size="xs" c="brand" fw={600}>• Якщо дисципліна вже існує, її дані (кредити, категорії, зв'язки) будуть оновлені.</Text>
          </Paper>

          <FileInput
            label="Оберіть файл для курсів"
            placeholder="Файл не обрано"
            accept=".xlsx,.xls,.csv,.json"
            leftSection={<IconUpload size={14} />}
            onChange={handleFileUpload}
            disabled={uploadLoading}
            size="md"
            radius="md"
          />

          {importResults && (
            <Paper p="md" withBorder radius="md" bg="gray.0">
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

      <Modal opened={specImportOpened} onClose={closeSpecImport} title="Імпорт освітніх програм" centered size="lg">
        <Stack gap="md">
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-brand-light)">
            <Text fw={700} size="sm" mb="xs">Інструкція:</Text>
            <Text size="xs" mb={4}>• Колонки: <b>Назва</b>, <b>Кредити</b> (напр. 240), Опис</Text>
            <Text size="xs" c="brand" fw={600}>• Якщо програма вже існує, її кредити та опис будуть оновлені.</Text>
          </Paper>

          <FileInput
            label="Оберіть файл для ОП"
            placeholder="Файл не обрано"
            accept=".xlsx,.xls,.csv,.json"
            leftSection={<IconUpload size={14} />}
            onChange={handleSpecImport}
            disabled={uploadLoading}
            size="md"
            radius="md"
          />

          {specImportResults && (
            <Paper p="md" withBorder radius="md" bg="gray.0">
              <Stack gap="xs">
                <Text fw={700} size="sm">Результати:</Text>
                <Group gap="xl">
                  <Text size="sm">Всього: <b>{specImportResults.total}</b></Text>
                  <Text size="sm" c="teal">Успішно: <b>{specImportResults.success}</b></Text>
                  <Text size="sm" c="red">Помилок: <b>{specImportResults.failed}</b></Text>
                </Group>
                {specImportResults.errors.length > 0 && (
                  <ScrollArea.Autosize mah={150} mt="xs">
                    <Stack gap={4}>
                      {specImportResults.errors.map((err, i) => (
                        <Text key={i} size="xs" c="red">• {err}</Text>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeSpecImport} radius="md">Закрити</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default CourseManagement;

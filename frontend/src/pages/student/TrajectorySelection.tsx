import React, { useState, useMemo, useEffect } from 'react';
import { Title, Paper, Button, Grid, Text, Group, Badge, Stack, Progress, Tabs, Tooltip, RingProgress, Center, ActionIcon, Alert, Box, TextInput, Loader, Flex, Table, ScrollArea } from '@mantine/core';
import { useInputState, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconSparkles, IconSend, IconTrash, IconAlertCircle, IconAlertTriangle, IconLock } from '@tabler/icons-react';
import apiClient from '../../api/apiClient';
interface CourseRecommendation {
  course: {
    id: string;
    name: string;
    ectsCredits: number;
    isSelective?: boolean;
    maxStudents?: number | null;
    enrolledCount?: number;
  };
  probability: number;
  category: string;
  schedule: string;
}

const TrajectorySelection: React.FC = () => {
  const [semester] = useState<number | string>(3);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(true);
  const [maxEcts, setMaxEcts] = useState(30);

  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [mandatoryCourses, setMandatoryCourses] = useState<CourseRecommendation[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [myTrajectories, setMyTrajectories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useInputState('');
  const isMobile = useMediaQuery('(max-width: 48em)');

  const handleGenerate = async (silent: boolean = false) => {
    setLoadingGenerations(true);
    try {
      const res = await apiClient.post('/trajectory/generate', { targetSemester: Number(semester) });
      const { recommendations: recs, mandatory, isSelectionOpen: openStatus, maxCreditsPerSem } = res.data.data;
      setRecommendations(recs || []);
      setMandatoryCourses(mandatory || []);
      setSelectedCourses(mandatory?.map((m: any) => m.course.id) || []);
      setIsSelectionOpen(openStatus);
      if (maxCreditsPerSem) setMaxEcts(maxCreditsPerSem);
      if (!silent) {
        notifications.show({ title: 'Успіх', message: 'Рекомендації сформовано!', color: 'teal' });
      }
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося згенерувати', color: 'red' });
    } finally {
      setLoadingGenerations(false);
    }
  };

  const fetchMyTrajectories = async () => {
    try {
      const res = await apiClient.get('/trajectory/my');
      setMyTrajectories(res.data.data);
    } catch (error) {
      console.error('Failed to fetch my trajectories', error);
    }
  };

  useEffect(() => {
    handleGenerate(true);
    fetchMyTrajectories();
  }, []);

  const handleCancelTrajectory = async (id: string) => {
    try {
      await apiClient.delete(`/trajectory/${id}`);
      notifications.show({ title: 'Успіх', message: 'Траєкторію скасовано. Тепер ви можете сформувати нову.', color: 'teal' });
      await fetchMyTrajectories();
      await handleGenerate(true);
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Не вдалося скасувати', color: 'red' });
    }
  };

  const handleToggleSelection = (id: string) => {
    const isMandatory = mandatoryCourses.some(m => m.course.id === id);
    if (isMandatory) {
      notifications.show({ title: 'Увага', message: 'Обовʼязкову дисципліну неможливо видалити', color: 'orange' });
      return;
    }

    if (selectedCourses.includes(id)) {
      setSelectedCourses(selectedCourses.filter(cId => cId !== id));
    } else {
      const rec = recommendations.find(r => r.course.id === id) || mandatoryCourses.find(m => m.course.id === id);
      if (rec && rec.course.maxStudents != null) {
        if ((rec.course.enrolledCount || 0) >= rec.course.maxStudents) {
          notifications.show({ title: 'Помилка', message: 'На цій дисципліні вже немає вільних місць', color: 'red' });
          return;
        }
      }
      setSelectedCourses([...selectedCourses, id]);
    }
  };

  const selectedCoursesData = useMemo(() => {
    const allAvailable = [...recommendations, ...mandatoryCourses];
    return selectedCourses.map(id => allAvailable.find(r => r.course.id === id)).filter(Boolean) as CourseRecommendation[];
  }, [selectedCourses, recommendations, mandatoryCourses]);

  const currentEctsCount = useMemo(() => selectedCoursesData.reduce((sum, item) => sum + item.course.ectsCredits, 0), [selectedCoursesData]);

  const scheduleConflicts = useMemo(() => {
    const schedules = selectedCoursesData.map(c => c.schedule).filter(s => s !== 'Не призначено');
    const uniqueSchedules = new Set(schedules);
    return schedules.length > uniqueSchedules.size;
  }, [selectedCoursesData]);

  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(recommendations.map(r => r.category)));
    return cats.length > 0 ? cats : ['Загальні'];
  }, [recommendations]);

  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (uniqueCategories.length > 0 && !activeTab) {
      setActiveTab(uniqueCategories[0]);
    }
  }, [uniqueCategories, activeTab]);

  const handleSubmit = async () => {
    setLoadingSubmit(true);
    try {
      await apiClient.post('/trajectory/submit', {
        courseIds: selectedCourses,
        semester: Number(semester)
      });
      notifications.show({ title: 'Успіх', message: 'Траєкторію відправлено на розгляд адміністратора', color: 'teal' });
      setRecommendations([]);
      setSelectedCourses([]);
      fetchMyTrajectories();
    } catch (error: any) {
      notifications.show({ title: 'Помилка', message: error.response?.data?.message || 'Помилка відправки', color: 'red' });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const renderCourseCard = (rec: CourseRecommendation) => {
    const isSelected = selectedCourses.includes(rec.course.id);
    const probPercentage = Math.round(rec.probability * 100);
    const colorProb = probPercentage >= 70 ? 'teal' : probPercentage >= 40 ? 'yellow' : 'red';

    const maxStudents = rec.course.maxStudents;
    const enrolled = rec.course.enrolledCount || 0;
    const isFull = maxStudents != null && enrolled >= maxStudents;
    const isDisabled = isFull && !isSelected;

    return (
      <Paper
        key={rec.course.id}
        className="glass-card"
        p="md"
        mb="sm"
        style={{
          borderLeft: isSelected
            ? `4px solid var(--mantine-color-brand-6)`
            : '1px solid light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1))',
          position: 'relative',
          opacity: isDisabled ? 0.6 : 1
        }}
      >
        <Flex justify={isMobile ? 'center' : 'space-between'} wrap={isMobile ? 'wrap' : 'nowrap'} align="center" gap="md">
          <Box style={{ flex: 1, minWidth: '200px' }}>
            <Text fw={700} size="md" c="light-dark(brand.9, brand.4)">{rec.course.name}</Text>
            <Group gap="xs" mt={4}>
              <Badge variant="light" color="brand" radius="sm">{rec.course.ectsCredits} ECTS</Badge>
              {maxStudents != null && (
                <Badge variant={isFull ? 'filled' : 'light'} color={isFull ? 'red' : 'green'} radius="sm">
                  Місць: {maxStudents - enrolled > 0 ? maxStudents - enrolled : 0} / {maxStudents}
                </Badge>
              )}
              <Text size="xs" c="dimmed">Розклад: {rec.schedule}</Text>
            </Group>
          </Box>
          <Flex gap={isMobile ? 'md' : 'lg'} wrap="nowrap" justify={isMobile ? 'space-between' : 'flex-end'} align="center" w={isMobile ? '100%' : 'auto'}>
            <Tooltip label="Прогноз успішності на основі вашої попередньої успішності" withArrow>
              <RingProgress
                size={48}
                thickness={4}
                roundCaps
                sections={[{ value: probPercentage, color: colorProb }]}
                label={
                  <Center>
                    <Text fw={800} size="xs">{probPercentage}%</Text>
                  </Center>
                }
              />
            </Tooltip>
            {isSelected ? (
              <Button color="red" variant="subtle" radius="md" onClick={() => handleToggleSelection(rec.course.id)}>
                Видалити
              </Button>
            ) : (
              <Button color="brand" variant="light" radius="md" onClick={() => handleToggleSelection(rec.course.id)} disabled={isDisabled}>
                {isFull ? 'Немає місць' : 'Додати'}
              </Button>
            )}
          </Flex>
        </Flex>
      </Paper>
    );
  };

  return (
    <Stack gap="lg" pb={100}>
      <Box>
        <Text size="xl" fw={800} className="premium-text-gradient">Вибір індивідуальної траєкторії</Text>
        <Text size="xs" c="dimmed">Оберіть дисципліни для наступного семестру на основі рекомендацій системи</Text>
      </Box>

      {myTrajectories.length > 0 && (
        <Paper className="premium-card" mb="xl">
          <Title order={3} mb="md">Мої подані траєкторії</Title>
          <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
            <Table.Thead bg="light-dark(gray.0, dark.6)">
              <Table.Tr>
                <Table.Th>Семестр</Table.Th>
                <Table.Th>Дата подачі</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Дисциплін</Table.Th>
                <Table.Th>Дії</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {myTrajectories.map(t => (
                <Table.Tr key={t.id}>
                  <Table.Td>{t.semester}</Table.Td>
                  <Table.Td>{new Date(t.createdAt).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={t.status === 'APPROVED' ? 'teal' : t.status === 'REJECTED' ? 'red' : 'brand'}
                      variant="light"
                    >
                      {t.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t.items?.length || 0}</Table.Td>
                  <Table.Td>
                    {t.status === 'PENDING' && (
                      <Button size="xs" variant="light" color="red" onClick={() => handleCancelTrajectory(t.id)}>
                        Скасувати
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Group justify="space-between">
        <Button
          leftSection={<IconSparkles size={18} />}
          onClick={() => handleGenerate()}
          loading={loadingGenerations}
          variant="gradient"
          gradient={{ from: 'brand.6', to: 'brand.8' }}
          radius="md"
          size="md"
        >
          Згенерувати рекомендації
        </Button>
      </Group>

      {loadingGenerations && (
        <Center my={50}>
          <Stack align="center">
            <Loader color="brand" size="xl" type="bars" />
            <Text size="sm" c="dimmed" fw={500}>Аналізуємо вашу успішність та формуємо рекомендації...</Text>
          </Stack>
        </Center>
      )}

      {!loadingGenerations && recommendations.length === 0 && (
        <Paper className="premium-card" p={50} ta="center" radius="lg" style={{ borderStyle: 'dashed', backgroundColor: 'transparent', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center">
            <IconAlertCircle size={48} color="var(--mantine-color-gray-4)" />
            <Text c="dimmed" fw={500}>Натисніть кнопку "Згенерувати", щоб отримати персоналізовані рекомендації.</Text>
          </Stack>
        </Paper>
      )}

      {(selectedCourses.length > 0 || (recommendations.length > 0 && !loadingGenerations)) && (
        <Paper className="premium-card kpi-card" mb="xl">
          {!isSelectionOpen && (
            <Alert icon={<IconLock size={16} />} title="Вибір закритий" color="orange" mb="md" radius="md" variant="light">
              Наразі період вибору навчальних дисциплін завершено або ще не розпочато. Ви можете переглядати рекомендації, але подати заявку неможливо.
            </Alert>
          )}
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">Статус формування</Text>
              <Badge color="brand" size="sm" variant="dot">Чернетка</Badge>
            </Group>
            <Text fw={800} size="sm">Обрано {currentEctsCount} з {maxEcts} ECTS</Text>
          </Group>
          <Progress
            value={Math.min((currentEctsCount / maxEcts) * 100, 100)}
            color={currentEctsCount > maxEcts ? 'red' : 'brand'}
            size="xl"
            radius="xl"
            mt="md"
            striped={currentEctsCount > 0}
            animated={currentEctsCount < maxEcts}
          />
        </Paper>
      )}

      {recommendations.length > 0 && (
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <TextInput
              placeholder="Шукати за назвою дисципліни..."
              value={searchQuery}
              onChange={setSearchQuery}
              mb="md"
              radius="md"
              size="md"
            />

            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
              <Tabs.List mb="md">
                {uniqueCategories.map(cat => (
                  <Tabs.Tab key={cat} value={cat}>{cat}</Tabs.Tab>
                ))}
              </Tabs.List>

              {uniqueCategories.map(cat => {
                const filteredCourses = recommendations
                  .filter(r => r.category === cat)
                  .filter(r => r.course.name.toLowerCase().includes(searchQuery.toLowerCase()));

                return (
                  <Tabs.Panel key={cat} value={cat}>
                    {filteredCourses.map(renderCourseCard)}
                    {filteredCourses.length === 0 && (
                      <Center py="xl">
                        <Text c="dimmed">За вашим запитом нічого не знайдено в цій категорії.</Text>
                      </Center>
                    )}
                  </Tabs.Panel>
                );
              })}
            </Tabs>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Paper className="premium-card" p="xl" style={{ position: isMobile ? 'relative' : 'sticky', top: '20px' }}>
              <Title order={3} mb="xl">Ваш план</Title>

              {selectedCoursesData.length > 0 ? (
                <ScrollArea.Autosize mah={400} mb="xl" type="hover" offsetScrollbars>
                  <Stack gap="md" pr="xs">
                    {selectedCoursesData.map(c => (
                      <Box key={c.course.id} p="sm" className="glass-card" style={{ border: 'none', borderRadius: '12px' }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={700} lineClamp={1}>{c.course.name}</Text>
                            <Group gap="xs">
                              <Text size="xs" c="dimmed" fw={500}>{c.course.ectsCredits} ECTS</Text>
                              {!c.course.isSelective && <Badge size="xs" variant="light">Обовʼязкова</Badge>}
                            </Group>
                          </Box>
                          {c.course.isSelective && (
                            <ActionIcon color="red" variant="subtle" onClick={() => handleToggleSelection(c.course.id)} radius="md">
                              <IconTrash size={18} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Box>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              ) : (
                <Center py="xl" style={{ flexDirection: 'column' }}>
                  <Text c="dimmed" size="sm" mb="lg" ta="center">Кошик порожній. Оберіть курси зі списку ліворуч.</Text>
                </Center>
              )}

              {currentEctsCount > maxEcts && (
                <Alert icon={<IconAlertCircle size={16} />} title="Увага!" color="red" mb="md" radius="md">
                  Перевищено ліміт кредитів ({currentEctsCount} &gt; {maxEcts}).
                </Alert>
              )}

              {scheduleConflicts && (
                <Alert icon={<IconAlertTriangle size={16} />} title="Конфлікт розкладу!" color="orange" mb="md" radius="md">
                  Обрані дисципліни мають співпадіння в розкладі.
                </Alert>
              )}

              <Button
                fullWidth
                color="brand"
                size="lg"
                radius="md"
                leftSection={<IconSend size={20} />}
                onClick={handleSubmit}
                loading={loadingSubmit}
                disabled={currentEctsCount !== maxEcts || scheduleConflicts || !isSelectionOpen}
                style={{ height: 60 }}
              >
                {isSelectionOpen ? 'Відправити на затвердження' : 'Вибір закритий'}
              </Button>
            </Paper>
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
};

export default TrajectorySelection;

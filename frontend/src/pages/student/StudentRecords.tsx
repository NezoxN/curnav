import React, { useEffect, useState } from 'react';
import {
  Text,
  Paper,
  Table,
  Group,
  Accordion,
  Badge,
  Loader,
  Center,
  Drawer,
  Stack,
  Divider,
  Progress,
  Grid,
  Title,
  ActionIcon,
  ScrollArea,
  Box,
} from '@mantine/core';
import { IconSchool, IconCalendarEvent, IconCertificate } from '@tabler/icons-react';
import apiClient from '../../api/apiClient';
import {
  type GroupedCourse,
  type StudentRecordsResponse,
  getECTSColor,
} from '../../utils/records.utils';

const StudentRecords: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentRecordsResponse | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<GroupedCourse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await apiClient.get('/student/records');
        setData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch records:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  if (loading || !data) {
    return (
      <Center h="70vh">
        <Loader color="brand" size="xl" type="bars" />
      </Center>
    );
  }

  const { groupedBySemester: semesterData, totalGPA, latestYear } = data;
  const semesters = Object.keys(semesterData).map(Number).sort((a, b) => b - a);

  const handleRowClick = (course: GroupedCourse) => {
    setSelectedCourse(course);
    setDrawerOpen(true);
  };

  return (
    <Stack gap="xl">
      <Box>
        <Text size="xl" fw={800} className="premium-text-gradient">Історія навчання</Text>
        <Text size="xs" c="dimmed">Перегляд успішності, семестрових балів та загального рейтингу</Text>
      </Box>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper className="premium-card kpi-card">
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">Середній бал (GPA)</Text>
              <ActionIcon variant="light" color="brand" radius="md">
                <IconSchool size={20} />
              </ActionIcon>
            </Group>
            <Group align="flex-end" gap={4}>
              <Title order={1}>{totalGPA}</Title>
              <Text size="sm" c="dimmed" mb={6}>/ 100</Text>
            </Group>
            <Progress value={totalGPA} color="brand" size="sm" radius="xl" mt="md" />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper className="premium-card kpi-card">
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">Поточний рік</Text>
              <ActionIcon variant="light" color="orange" radius="md">
                <IconCalendarEvent size={20} />
              </ActionIcon>
            </Group>
            <Group align="flex-end" gap={4}>
              <Title order={1}>{latestYear}</Title>
              <Text size="sm" c="dimmed" mb={6}>-й курс навчання</Text>
            </Group>
            <Progress value={(latestYear / 4) * 100} color="orange" size="sm" radius="xl" mt="md" />
          </Paper>
        </Grid.Col>
      </Grid>

      {semesters.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center" style={{ borderStyle: 'dashed', backgroundColor: 'transparent', borderColor: 'var(--mantine-color-dark-4)' }}>
          <Stack align="center" gap="sm">
            <IconCertificate size={48} color="var(--mantine-color-gray-4)" />
            <Text c="dimmed" fw={500}>У вашій заліковій книжці поки що немає записів.</Text>
            <Text size="xs" c="dimmed">Оцінки з'являться тут після завершення першої сесії.</Text>
          </Stack>
        </Paper>
      ) : (
        <Paper p="xl">
          <Title order={3} mb="xl">Історія за семестрами</Title>
          <Accordion variant="separated" radius="md" defaultValue={semesters.length > 0 ? semesters[0].toString() : null}>
            {semesters.map((sem) => {
              const semCourses = semesterData[sem as any];


              return (
                <Accordion.Item key={sem} value={sem.toString()} style={{ border: 'none', marginBottom: '10px' }}>
                  <Accordion.Control>
                    <Group justify="space-between" pr="md">
                      <Text fw={600}>{sem}-й семестр</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ScrollArea>
                      <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 600 }}>
                        <Table.Thead bg="light-dark(gray.0, dark.6)">
                          <Table.Tr>
                            <Table.Th>Дисципліна</Table.Th>
                            <Table.Th ta="center">Кредити</Table.Th>
                            <Table.Th ta="center">Бали</Table.Th>
                            <Table.Th>Національна шкала</Table.Th>
                            <Table.Th ta="center">ЄКТС</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {semCourses.map((c) => (
                            <Table.Tr
                              key={c.courseId}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleRowClick(c)}
                            >
                              <Table.Td fw={500}>{c.courseName}</Table.Td>
                              <Table.Td ta="center">{c.ectsCredits}</Table.Td>
                              <Table.Td ta="center" fw={700}>{c.totalGrade}</Table.Td>
                              <Table.Td>{c.nationalScale}</Table.Td>
                              <Table.Td ta="center">
                                <Badge color={getECTSColor(c.ectsGrade)} variant="filled">
                                  {c.ectsGrade}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Paper>
      )}

      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={<Text fw={700} size="lg">Деталізація оцінок: {selectedCourse?.courseName}</Text>}
        position="right"
        size="md"
        padding="xl"
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Загальний бал:</Text>
            <Badge size="lg" variant="dot" color={getECTSColor(selectedCourse?.ectsGrade || 'F')}>
              {selectedCourse?.totalGrade} ({selectedCourse?.ectsGrade})
            </Badge>
          </Group>
          <Divider />
          <ScrollArea>
            <Table verticalSpacing="md" horizontalSpacing="md" style={{ minWidth: 400 }}>
              <Table.Thead bg="light-dark(gray.0, dark.6)">
                <Table.Tr>
                  <Table.Th>Вид роботи</Table.Th>
                  <Table.Th ta="right">Бал</Table.Th>
                  <Table.Th ta="right">Дата</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {selectedCourse?.records.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>{r.assessmentName || 'Контрольний захід'}</Table.Td>
                    <Table.Td ta="right" fw={600}>{r.gradeValue}</Table.Td>
                    <Table.Td ta="right" c="dimmed">
                      {new Date(r.dateRecorded).toLocaleDateString()}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group mt="xl" justify="center">
            <IconCertificate size={48} stroke={1} color="var(--mantine-color-brand-2)" />
          </Group>
        </Stack>
      </Drawer>
    </Stack>
  );
};

export default StudentRecords;

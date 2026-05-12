import React, { useEffect, useState } from 'react';
import { Title, Paper, Group, Stack, Avatar, Loader, Box, Center, Badge, Text, Grid, SimpleGrid, ThemeIcon, Container, Divider, useMantineColorScheme, Flex } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconMail, IconSchool, IconStar, IconCalendar, IconBook, IconIdBadge } from '@tabler/icons-react';
import apiClient from '../../api/apiClient';
import { notifications } from '@mantine/notifications';
import { EDUCATION_FORMS } from '@/utils/validation';

interface ProfileData {
  profile: {
    fullName: string;
    email: string;
    groupCode: string;
    educationalProgram: string;
    currentSemester: number;
    educationForm: string;
  };
}

const StudentProfile: React.FC = () => {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 48em)');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/student/profile');
        setData(res.data.data);
      } catch (error) {
        notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані профілю', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <Center h="70vh">
        <Loader color="brand" size="xl" type="bars" />
      </Center>
    );
  }

  const { profile } = data;

  const DetailItem = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
    <Paper p="md" radius="lg" withBorder style={{ height: '100%' }}>
      <Group gap="md">
        <ThemeIcon variant="light" color={color} size={48} radius="md">
          <Icon size={24} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts="1px">{label}</Text>
          <Text fw={700} size="md">{value}</Text>
        </Stack>
      </Group>
    </Paper>
  );

  return (
    <Container size="xl" pb="xl">
      <Box mb="xl">
        <Paper
          radius="xl"
          p={40}
          withBorder
          bg="light-dark(gray.0, dark.7)"
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '220px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Flex
            justify={isMobile ? 'center' : 'space-between'}
            w="100%"
            wrap={isMobile ? 'wrap' : 'nowrap'}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Flex gap={isMobile ? 20 : 30} wrap={isMobile ? 'wrap' : 'nowrap'} justify={isMobile ? 'center' : 'flex-start'} align="center" style={{ textAlign: 'center' }}>
              <Avatar
                size={isMobile ? 80 : 120}
                radius="100%"
                color="brand"
                variant="light"
              >
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Stack gap={8} align={isMobile ? 'center' : 'flex-start'}>
                <Flex gap="xs" justify={isMobile ? 'center' : 'flex-start'}>
                  <Badge color="brand" variant="light" size="sm" fw={800}>
                    Студент
                  </Badge>
                </Flex>
                <Title order={1} fw={900} size={isMobile ? 24 : 36} style={{ lineHeight: 1.1 }} ta={isMobile ? 'center' : 'left'}>
                  {profile.fullName}
                </Title>
              </Stack>
            </Flex>
          </Flex>
        </Paper>
      </Box>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            <Paper p="xl" radius="xl" withBorder bg={isDark ? 'var(--mantine-color-dark-7)' : 'white'}>
              <Title order={4} mb="lg" fw={800}>Контактна інформація</Title>
              <Stack gap="md">
                <Group wrap="nowrap">
                  <ThemeIcon variant="subtle" color="brand" radius="md">
                    <IconMail size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text size="xs" c="dimmed" fw={600}>Email</Text>
                    <Text size="sm" fw={700}>{profile.email}</Text>
                  </Box>
                </Group>
                <Divider variant="dashed" />
                <Group wrap="nowrap">
                  <ThemeIcon variant="subtle" color="brand" radius="md">
                    <IconIdBadge size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text size="xs" c="dimmed" fw={600}>Статус</Text>
                    <Text size="sm" fw={700}>Активний</Text>
                  </Box>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            <Title order={3} fw={800} px="xs">Академічні дані</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <DetailItem
                icon={IconSchool}
                label="Група"
                value={profile.groupCode}
                color="brand"
              />
              <DetailItem
                icon={IconSchool}
                label="Освітня програма"
                value={profile.educationalProgram}
                color="blue"
              />
              <DetailItem
                icon={IconCalendar}
                label="Семестр навчання"
                value={`${profile.currentSemester} семестр`}
                color="orange"
              />
              <DetailItem
                icon={IconBook}
                label="Форма навчання"
                value={EDUCATION_FORMS.find(f => f.value === profile.educationForm)?.label || profile.educationForm}
                color="teal"
              />
            </SimpleGrid>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default StudentProfile;

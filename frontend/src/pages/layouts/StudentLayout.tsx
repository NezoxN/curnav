import React, { useEffect, useState } from 'react';
import { AppShell, Burger, Group, NavLink, Title, ActionIcon, Avatar, Text, useMantineColorScheme, Stack, Button, Divider, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IconRoute, IconLogout, IconClipboardList, IconSettings, IconSun, IconMoon, IconUser } from '@tabler/icons-react';
import { useDispatch } from 'react-redux';

import { logout } from '@/store/authSlice';
import apiClient from '@/api/apiClient';
import Logo from '@/components/Logo';

interface ProfileData {
  fullName: string;
  groupCode: string;
}

const StudentLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const [profile, setProfile] = React.useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/student/profile');
        setProfile(res.data.data.profile);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);
  const breadcrumbMap: Record<string, string> = {
    '/student': 'Мій профіль',
    '/student/records': 'Залікова книга',
    '/student/trajectory': 'Вибір дисциплін',
    '/student/settings': 'Налаштування',
  };


  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Backend logout failed', error);
    }
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="xl"
      styles={{
        main: {
          backgroundColor: 'light-dark(#f8f9fa, var(--mantine-color-dark-8))'
        }
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between" wrap="nowrap">
          <Group gap="xl">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />


            <Group>
              <Title order={4} fw={700} c="light-dark(brand.9, brand.4)" style={{ letterSpacing: '-0.01em' }}>
                {breadcrumbMap[location.pathname] || 'Профіль'}
              </Title>
            </Group>
          </Group>

          <Group gap="sm">

            <ActionIcon onClick={() => toggleColorScheme()} variant="light" size="lg" radius="md" color="brand">
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>

            <Divider orientation="vertical" />


            <Avatar color="brand" radius="md" src={null} size={36}>{profile?.fullName?.split(' ').map(n => n[0]).join('') || 'S'}</Avatar>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text size="xs" fw={700}>{profile?.fullName?.split(' ')[0] || 'Студент'}</Text>
              <Text size="xs" c="dimmed">{profile?.groupCode || 'Група'}</Text>
            </div>

          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p={0}
        bg={colorScheme === 'dark' ? 'brand.9' : 'brand.2'}
      >
        <AppShell.Section p="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => navigate('/student')} wrap="nowrap">
              <Logo size={28} />
              <Title order={3} style={{ color: colorScheme === 'dark' ? 'white' : 'black', fontSize: '1.1rem', marginBottom: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                CurriNav
              </Title>
            </Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} px="md">
          <Stack gap={2}>
            <NavLink
              label="Мій профіль"
              leftSection={<IconUser size="1.25rem" stroke={1.5} />}
              active={location.pathname === '/student'}
              onClick={() => navigate('/student')}
              variant="filled"
              color="brand"
              styles={{
                root: { transition: 'all 0.2s ease' },
                label: {
                  color: location.pathname === '/student' || colorScheme === 'dark' ? 'white' : 'black',
                  fontWeight: location.pathname === '/student' ? 600 : 400
                },
                section: {
                  color: location.pathname === '/student' || colorScheme === 'dark' ? 'white' : 'black'
                }
              }}
            />
            <NavLink
              label="Залікова книга"
              leftSection={<IconClipboardList size="1.25rem" stroke={1.5} />}
              active={location.pathname === '/student/records'}
              onClick={() => navigate('/student/records')}
              variant="filled"
              color="brand"
              styles={{
                root: { transition: 'all 0.2s ease' },
                label: {
                  color: location.pathname === '/student/records' || colorScheme === 'dark' ? 'white' : 'black',
                  fontWeight: location.pathname === '/student/records' ? 600 : 400
                },
                section: {
                  color: location.pathname === '/student/records' || colorScheme === 'dark' ? 'white' : 'black'
                }
              }}
            />
            <NavLink
              label="Вибір траєкторії"
              leftSection={<IconRoute size="1.25rem" stroke={1.5} />}
              active={location.pathname === '/student/trajectory'}
              onClick={() => navigate('/student/trajectory')}
              variant="filled"
              color="brand"
              styles={{
                root: { transition: 'all 0.2s ease' },
                label: {
                  color: location.pathname === '/student/trajectory' || colorScheme === 'dark' ? 'white' : 'black',
                  fontWeight: location.pathname === '/student/trajectory' ? 600 : 400
                },
                section: {
                  color: location.pathname === '/student/trajectory' || colorScheme === 'dark' ? 'white' : 'black'
                }
              }}
            />
            <NavLink
              label="Налаштування"
              leftSection={<IconSettings size="1.25rem" stroke={1.5} />}
              active={location.pathname === '/student/settings'}
              onClick={() => navigate('/student/settings')}
              variant="filled"
              color="brand"
              styles={{
                root: { transition: 'all 0.2s ease' },
                label: {
                  color: location.pathname === '/student/settings' || colorScheme === 'dark' ? 'white' : 'black',
                  fontWeight: location.pathname === '/student/settings' ? 600 : 400
                },
                section: {
                  color: location.pathname === '/student/settings' || colorScheme === 'dark' ? 'white' : 'black'
                }
              }}
            />
          </Stack>
        </AppShell.Section>

        <AppShell.Section p="md">
          <Stack gap="xs">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={18} />}
              onClick={handleLogout}
              px="md"
              mx="md"
              radius="md"
            >
              Вийти
            </Button>

            <Divider mb="sm" mx="md" opacity={0.1} />
            <Group justify="center" gap="xs" opacity={0.4}>
              <Logo size={20} />
              <Text size="xs" fw={700} c="white">CurriNav</Text>
            </Group>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
};

export default StudentLayout;

import React from 'react';
import { AppShell, Burger, Group, NavLink, Title, ActionIcon, Avatar, Stack, Text, ScrollArea, useMantineColorScheme, Divider, Button, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IconUsers,
  IconBooks,
  IconLogout,
  IconSettings,
  IconChecklist,
  IconFileSpreadsheet,
  IconSun,
  IconMoon,
  IconShieldLock
} from '@tabler/icons-react';
import { useDispatch } from 'react-redux';

import { logout } from '@/store/authSlice';
import Logo from '@/components/Logo';
import apiClient from '@/api/apiClient';

const AdminLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Backend logout failed', error);
    }
    dispatch(logout());
    navigate('/login');
  };

  const navLinks = [
    { label: 'Студенти', icon: IconUsers, path: '/admin/students' },
    { label: 'Адміністратори', icon: IconShieldLock, path: '/admin/admins' },
    { label: 'Освітній контент', icon: IconBooks, path: '/admin/courses' },
    { label: 'Запити траєкторій', icon: IconChecklist, path: '/admin/approval' },
    { label: 'Керування оцінками', icon: IconFileSpreadsheet, path: '/admin/grades' },
    { label: 'Налаштування', icon: IconSettings, path: '/admin/settings' },
  ];

  const breadcrumbMap: Record<string, string> = {
    '/admin': 'Студенти',
    '/admin/students': 'Студенти',
    '/admin/admins': 'Адміністратори',
    '/admin/courses': 'Освітній контент',
    '/admin/approval': 'Запити траєкторій',
    '/admin/grades': 'Керування оцінками',
    '/admin/settings': 'Налаштування',
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
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

            <Title order={4} fw={700} c="light-dark(brand.9, brand.4)" style={{ letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {breadcrumbMap[location.pathname] || 'Головна'}
            </Title>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <ActionIcon onClick={() => toggleColorScheme()} variant="light" size="lg" radius="md" color="brand">
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>

            <Divider orientation="vertical" visibleFrom="xs" />

            <Group gap="xs" style={{ cursor: 'pointer' }} wrap="nowrap">
              <Avatar color="brand" radius="md" src={null} size={36}>АД</Avatar>
              <Box visibleFrom="xs" style={{ flex: 1 }}>
                <Text size="xs" fw={700} style={{ whiteSpace: 'nowrap' }}>Адміністратор</Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Керування системою</Text>
              </Box>
            </Group>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p={0}
        bg={colorScheme === 'dark' ? 'brand.9' : 'brand.2'}
      >
        <AppShell.Section p="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => navigate('/admin/students')} wrap="nowrap">
              <Logo size={28} />
              <Title order={3} style={{ color: colorScheme === 'dark' ? 'white' : 'black', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                CurriNav
              </Title>
            </Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} px="md">
          <Stack gap={2}>
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                label={link.label}
                leftSection={<link.icon size="1.25rem" stroke={1.5} />}
                active={location.pathname === link.path}
                onClick={() => navigate(link.path)}
                variant="filled"
                color="brand"
                styles={{
                  root: {
                    transition: 'all 0.2s ease',
                  },
                  label: { 
                    color: location.pathname === link.path || colorScheme === 'dark' ? 'white' : 'black',
                    fontWeight: location.pathname === link.path ? 600 : 400
                  },
                  section: { 
                    color: location.pathname === link.path || colorScheme === 'dark' ? 'white' : 'black' 
                  }
                }}
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section p="md">
          <Stack gap="xs">
            <Button
              variant="subtle"
              color="red"
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
        <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default AdminLayout;

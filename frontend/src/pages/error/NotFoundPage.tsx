import React from 'react';
import { Container, Title, Text, Center, Stack } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';

const NotFoundPage: React.FC = () => {

  return (
    <Container size="md" h="100vh">
      <Center h="100%">
        <Stack align="center" gap="xl">
          <IconError404 size={120} color="var(--mantine-color-brand-filled)" stroke={1.5} />

          <Stack align="center" gap="xs">
            <Title order={1} style={{ fontSize: '3rem', fontWeight: 900 }}>
              Сторінку не знайдено
            </Title>
            <Text c="dimmed" size="lg" ta="center" maw={500}>
              На жаль, за цією адресою нічого немає. Можливо, ви помилилися в написанні або сторінка була видалена.
            </Text>
          </Stack>
        </Stack>
      </Center>
    </Container>
  );
};

export default NotFoundPage;

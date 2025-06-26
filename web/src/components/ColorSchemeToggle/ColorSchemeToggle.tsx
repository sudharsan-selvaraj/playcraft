import { Button, Group, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group justify="center" mt="xl">
      <Button variant="danger" onClick={() => setColorScheme('light')}>
        Light
      </Button>
      <Button variant="danger" onClick={() => setColorScheme('dark')}>
        Dark
      </Button>
      <Button variant="danger" onClick={() => setColorScheme('auto')}>
        Auto
      </Button>
    </Group>
  );
}

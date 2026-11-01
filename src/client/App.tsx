import { Button, Container, Stack, Text, Title } from '@mantine/core';

export function App() {
  return (
    <Container size="sm" py="xl">
      <Stack>
        <Title order={1}>RVL Setup</Title>
        <Text>
          Hello, world. The boards on the network will be listed here.
        </Text>
        <Button w="fit-content">A button, to show the theme</Button>
      </Stack>
    </Container>
  );
}

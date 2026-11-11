import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { connectToSetup } from 'rvl-setup/client';

import { App } from './App.tsx';
import { connect } from './connection.ts';
import { theme } from './theme.ts';

const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html has no #root element');
}

connect();
connectToSetup();
createRoot(root).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </StrictMode>
);

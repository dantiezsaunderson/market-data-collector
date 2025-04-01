import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Dashboard from './pages/Dashboard';
import DataCollection from './pages/DataCollection';
import DataVisualization from './pages/DataVisualization';
import DataManagement from './pages/DataManagement';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collect" element={<DataCollection />} />
          <Route path="/visualize" element={<DataVisualization />} />
          <Route path="/manage" element={<DataManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Box>
  );
}

export default App;

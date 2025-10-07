const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || 'http://172.104.160.132:3000';
const AUTH_TOKEN = process.env.BUS_API_TOKEN || 'BCC2025';

// Middleware
app.use(cors());
app.use(express.json());

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Proxy endpoint for devices
app.get('/proxy/devices', async (req, res) => {
  try {
    console.log('Fetching devices from:', `${BASE_URL}/devices`);
    const response = await apiClient.get('/devices');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching devices:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch devices',
      message: error.message 
    });
  }
});

// Proxy endpoint for device data
app.get('/proxy/data', async (req, res) => {
  try {
    const { device_id } = req.query;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id parameter is required' });
    }

    console.log('Fetching data for device:', device_id);
    const response = await apiClient.get(`/data?device_id=${device_id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching device data:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch device data',
      message: error.message 
    });
  }
});

// Proxy endpoint for device history
app.get('/proxy/history', async (req, res) => {
  try {
    const { device_id } = req.query;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id parameter is required' });
    }

    console.log('Fetching history for device:', device_id);
    const response = await apiClient.get(`/history?device_id=${device_id}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching device history:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch device history',
      message: error.message 
    });
  }
});

// Server-Sent Events endpoint for live updates
app.get('/proxy/live', async (req, res) => {
  const { device_id } = req.query;
  
  if (!device_id) {
    return res.status(400).json({ error: 'device_id parameter is required' });
  }

  console.log('Starting SSE stream for device:', device_id);

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to live updates' })}\\n\\n`);

  let intervalId;
  let isConnected = true;

  const sendLiveData = async () => {
    if (!isConnected) return;

    try {
      const response = await apiClient.get(`/data?device_id=${device_id}`);
      const data = {
        type: 'update',
        timestamp: new Date().toISOString(),
        device_id: device_id,
        data: response.data
      };
      
      res.write(`data: ${JSON.stringify(data)}\\n\\n`);
    } catch (error) {
      console.error('Error in SSE stream:', error.message);
      const errorData = {
        type: 'error',
        timestamp: new Date().toISOString(),
        message: error.message
      };
      res.write(`data: ${JSON.stringify(errorData)}\\n\\n`);
    }
  };

  // Send updates every 5 seconds
  intervalId = setInterval(sendLiveData, 5000);

  // Send initial data
  sendLiveData();

  // Handle client disconnect
  req.on('close', () => {
    console.log('SSE client disconnected for device:', device_id);
    isConnected = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    isConnected = false;
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Bus Tracker API server running on http://localhost:${PORT}`);
  console.log(`Proxying requests to: ${BASE_URL}`);
  console.log(`Using auth token: Bearer ${AUTH_TOKEN}`);
});

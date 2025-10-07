'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Dynamic import for BusMap to avoid SSR issues with Leaflet
const BusMap = dynamic(() => import('@/components/BusMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Loading interactive map...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const [devices, setDevices] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [busData, setBusData] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eventSource, setEventSource] = useState(null);

  // Fetch available devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Set up SSE connection when a bus is selected
  useEffect(() => {
    if (selectedBus) {
      setupLiveUpdates();
    } else {
      closeLiveUpdates();
    }

    return () => {
      closeLiveUpdates();
    };
  }, [selectedBus]);

  const fetchDevices = async () => {
    try {
      setError(null);
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      console.log('Received devices data:', data); // Debug log
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load bus list');
      console.error('Error fetching devices:', err);
    }
  };

  const fetchBusData = async (deviceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/data?device_id=${deviceId}`);
      if (!response.ok) throw new Error('Failed to fetch bus data');
      const data = await response.json();
      setBusData(data);
    } catch (err) {
      setError('Failed to load bus location');
      console.error('Error fetching bus data:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupLiveUpdates = () => {
    closeLiveUpdates(); // Close any existing connection
    
    if (!selectedBus) return;

    try {
      const es = new EventSource(`/api/live?device_id=${selectedBus}`);
      
      es.onopen = () => {
        console.log('SSE connection opened for', selectedBus);
      };
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update' && data.data) {
            setLiveUpdates(data);
            setBusData(data.data); // Update the base bus data as well
          } else if (data.type === 'error') {
            console.error('SSE error:', data.message);
            setError('Live updates temporarily unavailable');
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };
      
      es.onerror = (event) => {
        console.error('SSE connection error:', event);
        setError('Connection lost. Retrying...');
        
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (selectedBus) {
            setupLiveUpdates();
          }
        }, 5000);
      };
      
      setEventSource(es);
    } catch (err) {
      console.error('Error setting up SSE:', err);
      setError('Failed to start live updates');
    }
  };

  const closeLiveUpdates = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setLiveUpdates(null);
    }
  };

  const handleBusSelection = async (deviceId) => {
    setSelectedBus(deviceId);
    setBusData(null);
    setLiveUpdates(null);
    
    if (deviceId) {
      await fetchBusData(deviceId);
    }
  };

  const refreshData = () => {
    if (selectedBus) {
      fetchBusData(selectedBus);
    }
    fetchDevices();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Bus Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Real-time bus location tracking with live updates
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a Bus</CardTitle>
            <CardDescription>
              Choose a bus to track its real-time location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select value={selectedBus} onValueChange={handleBusSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bus..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device, index) => {
                      const deviceId = typeof device === 'object' ? device.device_id : device;
                      const displayName = typeof device === 'object' ? device.device_id : device;
                      return (
                        <SelectItem key={deviceId || `device-${index}`} value={deviceId || `device-${index}`}>
                          {displayName || `Device ${index + 1}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={refreshData} variant="outline">
                Refresh
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading bus data...</p>
              </div>
            )}

            {selectedBus && !loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Tracking: {selectedBus}</h3>
                  {liveUpdates && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600">Live</span>
                    </div>
                  )}
                </div>
                
                {busData && (
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                    {/* {busData.lat && <span>Lat: {busData.lat}</span>}
                    {busData.lng && <span>Lng: {busData.lng}</span>} */}
                    {busData.speed && <span>Speed: {busData.speed} km/h</span>}
                    {busData.timestamp && (
                      <span>Updated: {new Date(busData.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedBus && busData && (
          <Card>
            <CardHeader>
              <CardTitle>Live Map</CardTitle>
              <CardDescription>
                Your location and the selected bus with distance calculation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusMap 
                selectedBus={selectedBus}
                busData={busData}
                liveUpdates={liveUpdates}
              />
            </CardContent>
          </Card>
        )}

        {!selectedBus && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                Select a bus above to see its location on the map
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
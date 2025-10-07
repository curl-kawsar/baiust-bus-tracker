'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance, formatDistance } from '@/lib/utils';

// Note: Removed leaflet-routing-machine due to internal library issues
// Using direct OSRM API calls instead for more reliable routing

// Fix for default markers in react-leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom icons
const createUserIcon = () => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="14" fill="#3b82f6" stroke="white" stroke-width="2"/>
      <g transform="translate(15, 15)">
        <circle cx="0" cy="-3" r="3" fill="white"/>
        <path d="M-4 2 C-4 -1, -2 -3, 0 -3 C2 -3, 4 -1, 4 2 L4 6 C4 7, 3 8, 2 8 L-2 8 C-3 8, -4 7, -4 6 Z" fill="white"/>
      </g>
    </svg>
  `),
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const createBusIcon = () => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="8" width="20" height="14" rx="2" fill="#ef4444" stroke="white" stroke-width="2"/>
      <rect x="7" y="10" width="6" height="4" fill="white"/>
      <rect x="17" y="10" width="6" height="4" fill="white"/>
      <circle cx="9" cy="20" r="2" fill="#374151"/>
      <circle cx="21" cy="20" r="2" fill="#374151"/>
    </svg>
  `),
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Component to fit bounds when data changes (only on initial load)
function MapBoundsUpdater({ userLocation, busLocation, shouldFitBounds, isInitialLoad }) {
  const map = useMap();
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    // Only fit bounds on the very first load or when explicitly requested
    if (!shouldFitBounds && !isInitialLoad) return;
    if (hasSetInitialView.current && !isInitialLoad) return;

    if (userLocation && busLocation && isInitialLoad) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [busLocation.lat, busLocation.lng]
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
      hasSetInitialView.current = true;
    } else if (userLocation && !hasSetInitialView.current) {
      map.setView([userLocation.lat, userLocation.lng], 13);
      hasSetInitialView.current = true;
    }
  }, [map, userLocation, busLocation, shouldFitBounds, isInitialLoad]);

  return null;
}

// Alternative routing using direct API calls to avoid library issues
function RoutingControl({ userLocation, busLocation, onRouteFound }) {
  const map = useMap();
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!userLocation || !busLocation) return;

    console.log('Fetching route between:', userLocation, 'and', busLocation);

    // Clean up existing route layer
    if (routeLayerRef.current) {
      try {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      } catch (error) {
        console.warn('Error removing existing route layer:', error);
      }
    }

    // Fetch route from OSRM API directly
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${busLocation.lng},${busLocation.lat}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates;
          
          // Convert coordinates to Leaflet format [lat, lng]
          const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
          
          // Create polyline for the route
          const routePolyline = L.polyline(latLngs, {
            color: '#3b82f6',
            weight: 6,
            opacity: 0.8
          });

          // Add white outline
          const routeOutline = L.polyline(latLngs, {
            color: '#ffffff',
            weight: 8,
            opacity: 0.6
          });

          // Create layer group
          const routeGroup = L.layerGroup([routeOutline, routePolyline]);
          map.addLayer(routeGroup);
          routeLayerRef.current = routeGroup;

          // Calculate distance and time
          const distanceInKm = (route.distance / 1000).toFixed(2);
          const timeInMinutes = Math.round(route.duration / 60);

          console.log(`Route found: ${distanceInKm}km, ${timeInMinutes} minutes`);

          if (onRouteFound) {
            onRouteFound({
              distance: distanceInKm,
              time: timeInMinutes,
              instructions: route.legs?.[0]?.steps || []
            });
          }

        } else {
          console.warn('No route found');
          if (onRouteFound) {
            onRouteFound(null);
          }
        }

      } catch (error) {
        console.error('Error fetching route:', error);
        if (onRouteFound) {
          onRouteFound(null);
        }
      }
    };

    fetchRoute();

    return () => {
      if (routeLayerRef.current) {
        try {
          map.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        } catch (error) {
          console.warn('Error removing route layer on cleanup:', error);
        }
      }
    };
  }, [map, userLocation, busLocation, onRouteFound]);

  return null;
}

export default function BusMap({ selectedBus, busData, liveUpdates }) {
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [userIcon, setUserIcon] = useState(null);
  const [busIcon, setBusIcon] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showRouting, setShowRouting] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const mapRef = useRef(null);

  // Initialize icons after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserIcon(createUserIcon());
      setBusIcon(createBusIcon());
    }
  }, []);

  // Debug logs
  useEffect(() => {
    console.log('BusMap - selectedBus:', selectedBus);
    console.log('BusMap - busData:', busData);
    console.log('BusMap - liveUpdates:', liveUpdates);
  }, [selectedBus, busData, liveUpdates]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('User location obtained:', location);
          setUserLocation(location);
        },
        (error) => {
          console.error('Error getting user location:', error);
          // Default to London if geolocation fails
          const defaultLocation = { lat: 51.505, lng: -0.09 };
          console.log('Using default location:', defaultLocation);
          setUserLocation(defaultLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      // Default location
      const defaultLocation = { lat: 51.505, lng: -0.09 };
      console.log('Using default location (no geolocation):', defaultLocation);
      setUserLocation(defaultLocation);
    }
  }, []);

  // Calculate distance when locations change
  useEffect(() => {
    if (userLocation && busData && busData.lat && (busData.lng || busData.lon)) {
      const busLng = busData.lng || busData.lon;
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parseFloat(busData.lat),
        parseFloat(busLng)
      );
      setDistance(dist);
      console.log('Distance calculated:', dist, 'km');
    } else {
      setDistance(null);
    }
  }, [userLocation, busData]);

  // Reset route info when switching between routing modes
  useEffect(() => {
    if (!showRouting) {
      setRouteInfo(null);
    }
  }, [showRouting]);

  // Mark as no longer initial load after first bus data
  useEffect(() => {
    if (busData && isInitialLoad) {
      // Set a timeout to allow initial view to be set, then disable auto-fitting
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 1000);
    }
  }, [busData, isInitialLoad]);

  // Use live updates if available, otherwise use busData
  const currentBusData = liveUpdates?.data || busData;
  
  if (!userLocation) {
    return (
      <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map and getting your location...</p>
      </div>
    );
  }

  // Handle both lng and lon properties from API response
  const busLocation = currentBusData?.lat && (currentBusData?.lng || currentBusData?.lon)
    ? { 
        lat: parseFloat(currentBusData.lat), 
        lng: parseFloat(currentBusData.lng || currentBusData.lon) 
      }
    : null;

  console.log('Processed busLocation:', busLocation);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setShowRouting(true)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${showRouting ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Road Route
          </button>
          <button
            onClick={() => setShowRouting(false)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${!showRouting ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Direct Line
          </button>
        </div>
        
        {liveUpdates && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(liveUpdates.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      
      <div className="h-[600px] rounded-lg overflow-hidden border bg-gray-100">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={13}
          style={{ height: '600px', width: '100%', minHeight: '600px' }}
          ref={mapRef}
          whenReady={(map) => {
            // Track user interactions to prevent auto-fitting bounds
            map.target.on('zoomstart dragstart zoomend moveend', () => {
              setHasUserInteracted(true);
              setIsInitialLoad(false);
            });
          }}
        >
          <LayersControl position="topright">
            {/* Street Map Layer */}
            <LayersControl.BaseLayer checked name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {/* Satellite Layer */}
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            {/* Hybrid Layer (Satellite + Labels) */}
            <LayersControl.BaseLayer name="Hybrid">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                opacity={0.4}
              />
            </LayersControl.BaseLayer>

            {/* Terrain Layer */}
            <LayersControl.BaseLayer name="Terrain">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            {/* Dark Theme Layer */}
            <LayersControl.BaseLayer name="Dark">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {/* User location marker */}
          {userIcon && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div>
                  <strong>Your Location</strong>
                  <br />
                  Lat: {userLocation.lat.toFixed(6)}
                  <br />
                  Lng: {userLocation.lng.toFixed(6)}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Bus location marker */}
          {busLocation && busIcon && (
            <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon}>
              <Popup>
                <div>
                  <strong>{selectedBus}</strong>
                  <br />
                  Lat: {busLocation.lat.toFixed(6)}
                  <br />
                  Lng: {busLocation.lng.toFixed(6)}
                  {busData?.speed && <><br />Speed: {busData.speed} km/h</>}
                  {busData?.last_ts && <><br />Updated: {new Date(busData.last_ts).toLocaleTimeString()}</>}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Conditional routing or straight line */}
          {busLocation && showRouting && (
            <RoutingControl 
              key={`${userLocation?.lat}-${userLocation?.lng}-${busLocation?.lat}-${busLocation?.lng}`}
              userLocation={userLocation} 
              busLocation={busLocation}
              onRouteFound={setRouteInfo}
            />
          )}
          
          {/* Direct line between user and bus (when routing disabled) */}
          {busLocation && !showRouting && (
            <Polyline
              positions={[
                [userLocation.lat, userLocation.lng],
                [busLocation.lat, busLocation.lng]
              ]}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
          
          {/* Update map bounds when locations change (only on initial load) */}
          <MapBoundsUpdater 
            userLocation={userLocation} 
            busLocation={busLocation} 
            shouldFitBounds={!hasUserInteracted}
            isInitialLoad={isInitialLoad}
          />
        </MapContainer>
      </div>
      
      {!busLocation && selectedBus && (
        <div className="text-center text-muted-foreground">
          <p>No location data available for {selectedBus}</p>
          <p className="text-sm">Bus data: {JSON.stringify(currentBusData)}</p>
        </div>
      )}
    </div>
  );
}
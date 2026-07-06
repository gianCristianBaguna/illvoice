'use client';

import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { toast } from 'sonner';

interface Barangay {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}

export default function BarangayManagementPage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<any>(null);

  const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchBarangays();
  }, [isAuthenticated, router]);

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/admin/barangays');
      if (response.ok) {
        const data = await response.json();
        setBarangays(data);
      }
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const handleAddBarangay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/barangays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add barangay');
      }

      const newBarangay = await response.json();
      setBarangays([...barangays, newBarangay]);
      setName('');
      setLatitude('');
      setLongitude('');
      setAddress('');
      setOpen(false);
      toast.success('Barangay added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add barangay');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || leafletRef.current) return;

    const leaflet = await import('leaflet');
    const L = (leaflet.default || leaflet) as any;
    leafletRef.current = L;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      scrollWheelZoom: true,
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (latitude && longitude) {
      const pos: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
      const marker = L.marker(pos, { draggable: true }).addTo(map);
      markerRef.current = marker;
      map.setView(pos, 15);

      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        setLatitude(newPos.lat.toString());
        setLongitude(newPos.lng.toString());
      });
    }

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setLatitude(lat.toString());
      setLongitude(lng.toString());

      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = newMarker;

      newMarker.on('dragend', () => {
        const newPos = newMarker.getLatLng();
        setLatitude(newPos.lat.toString());
        setLongitude(newPos.lng.toString());
      });

      map.setView([lat, lng], map.getZoom());
    });
  }, [latitude, longitude]);

  useEffect(() => {
    let cancelled = false;

    if (mapOpen) {
      const timer = setTimeout(() => {
        if (!cancelled) initMap();
      }, 100);

      return () => {
        clearTimeout(timer);
        cancelled = true;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          leafletRef.current = null;
        }
      };
    }
  }, [mapOpen, initMap]);

  const openMapSelector = () => {
    setMapOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Barangay Management</h1>
              <Button variant="destructive" onClick={handleLogout} size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Barangays</CardTitle>
                <CardDescription>Manage barangay locations for report assignment</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="mb-4">Add Barangay</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Barangay</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBarangay} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Barangay Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Barangay San Isidro"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address (Optional)</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g., San Isidro Street, Manila"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="latitude">Latitude</Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="e.g., 14.5995"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="longitude">Longitude</Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="e.g., 120.9842"
                            required
                          />
                        </div>
                      </div>

                      <Button type="button" variant="outline" onClick={openMapSelector} className="w-full">
                        Select Location on Map
                      </Button>

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Adding...' : 'Add Barangay'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={mapOpen} onOpenChange={setMapOpen}>
                  <DialogContent className="max-w-4xl max-h-[80vh] p-0">
                    <DialogHeader className="p-4 pb-0">
                      <DialogTitle>Select Barangay Location</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                      <p className="text-sm text-slate-600 mb-2">Click on the map to place a marker, or drag the marker to adjust the location.</p>
                      <div ref={mapContainerRef} className="map-container h-[500px] w-full rounded-lg border" />
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setMapOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setMapOpen(false)}>
                          Confirm Location
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Latitude</TableHead>
                      <TableHead>Longitude</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barangays.map((barangay) => (
                      <TableRow key={barangay.id}>
                        <TableCell>{barangay.name}</TableCell>
                        <TableCell>{barangay.address || '-'}</TableCell>
                        <TableCell>{barangay.latitude.toFixed(6)}</TableCell>
                        <TableCell>{barangay.longitude.toFixed(6)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
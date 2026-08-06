'use client';

import 'leaflet/dist/leaflet.css';

import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { fetchComplaints } from '@/lib/api';
import { Complaint, SeverityLevel } from '@/lib/types';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type LeafletModule = typeof import('leaflet');

const DEFAULT_CENTER: [number, number] = [10.7202, 122.5621];

const severityInfo: Record<SeverityLevel, { label: string; className: string; description: string; weight: number }> = {
  HIGH: {
    label: 'High',
    className: 'high',
    description: 'Needs immediate action',
    weight: 1.0,
  },
  MODERATE: {
    label: 'Moderate',
    className: 'moderate',
    description: 'Needs scheduled action',
    weight: 0.6,
  },
  LOW: {
    label: 'Low',
    className: 'low',
    description: 'Routine monitoring',
    weight: 0.3,
  },
};

function getReportLocation(report: Complaint) {
  if (report.address) return report.address;
  if (report.barangay) return report.barangay;
  if (typeof report.latitude === 'number' && typeof report.longitude === 'number') {
    return 'Location recorded';
  }
  return 'Location not recorded';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function MapViewPage() {
  const [reports, setReports] = useState<Complaint[]>([]);
  const [visibleReports, setVisibleReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const heatmapRef = useRef<any>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const reportsWithLocationRef = useRef<Complaint[]>([]);

  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const reportsWithLocation = useMemo(
    () => reports.filter((report) => typeof report.latitude === 'number' && typeof report.longitude === 'number'),
    [reports],
  );

  const refreshMarkers = useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!L || !map) return;

    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    if (heatmapRef.current) {
      map.removeLayer(heatmapRef.current);
      heatmapRef.current = null;
    }

    const bounds = map.getBounds();
    const nextVisibleReports = reportsWithLocationRef.current.filter((report) =>
      bounds.contains(L.latLng(report.latitude as number, report.longitude as number)),
    );

    setVisibleReports(nextVisibleReports);

    nextVisibleReports.forEach((report) => {
      const severity = severityInfo[report.severity];
      const icon = L.divIcon({
        className: 'map-pin-icon',
        html: `<span class="map-pin ${severity.className}"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([report.latitude as number, report.longitude as number], { icon })
        .bindPopup(`
          <div class="map-popup">
            <div class="map-popup-title">${escapeHtml(report.title)}</div>
            <div class="map-popup-location">${escapeHtml(getReportLocation(report))}</div>
            <div class="map-popup-severity ${severity.className}">${severity.label}</div>
          </div>
        `)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (showHeatmap && reportsWithLocationRef.current.length > 0) {
      const heatmapData = reportsWithLocationRef.current.map((report) => [
        report.latitude,
        report.longitude,
        severityInfo[report.severity].weight,
      ]);

      const heatmapLayer = (L as any).heatLayer
        ? (L as any).heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.3: '#10b981', 0.6: '#f59e0b', 1.0: '#ef4444' },
          })
        : null;

      if (heatmapLayer) {
        heatmapLayer.addTo(map);
        heatmapRef.current = heatmapLayer;
      }
    }
  }, [showHeatmap]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    const loadReports = async () => {
      try {
        const data = await fetchComplaints();
        setReports(data);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [isAuthenticated, router]);

  useEffect(() => {
    reportsWithLocationRef.current = reportsWithLocation;
    refreshMarkers();
  }, [reportsWithLocation, refreshMarkers]);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      const leaflet = await import('leaflet');
      const L = (leaflet.default || leaflet) as LeafletModule;

      if (cancelled) return;

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 7,
        scrollWheelZoom: true,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const syncVisibleReports = () => {
        const bounds = map.getBounds();
        const nextVisibleReports = reportsWithLocationRef.current.filter((report) =>
          bounds.contains(L.latLng(report.latitude as number, report.longitude as number)),
        );

        setVisibleReports(nextVisibleReports);
        refreshMarkers();
      };

      map.on('moveend', syncVisibleReports);
      map.on('zoomend', syncVisibleReports);

      // Initial marker refresh
      refreshMarkers();

      // Invalidate map size to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      cleanupRef.current = () => {
        map.off('moveend', syncVisibleReports);
        map.off('zoomend', syncVisibleReports);
        map.remove();
        mapRef.current = null;
        leafletRef.current = null;
        markersRef.current = [];
      };

      return cleanupRef.current;
    };

    initMap();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [refreshMarkers]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-600">
        Loading map...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Sidebar />

      <div className="md:ml-48">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-4 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div className="ml-10 md:ml-0">
                <h1 className="text-xl font-bold text-slate-950 md:text-2xl">Map View</h1>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  View reports by location and severity on the map
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout} size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 md:px-6 md:py-6">
          <div className="mx-auto max-w-7xl space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Reports in this map area</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Drag or zoom the map. The list updates only for pins inside the visible area.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="heatmap-toggle"
                      checked={showHeatmap}
                      onCheckedChange={setShowHeatmap}
                    />
                    <Label htmlFor="heatmap-toggle" className="text-xs font-medium text-slate-600 cursor-pointer">
                      Heatmap
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(severityInfo) as SeverityLevel[]).map((severity) => (
                      <div
                        key={severity}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        <span className={`map-pin-small ${severityInfo[severity].className}`} />
                        {severityInfo[severity].label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div ref={mapContainerRef} className="map-container" />

              <div className="mt-2 text-xs text-slate-500">
                Total reports: {reports.length} | With location: {reportsWithLocation.length}
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-950">Severity color coding</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Pin color shows the report severity.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {(Object.keys(severityInfo) as SeverityLevel[]).map((severity) => (
                    <div key={severity} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <span className={`map-pin-large ${severityInfo[severity].className}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{severityInfo[severity].label}</p>
                        <p className="mt-1 text-xs text-slate-500">{severityInfo[severity].description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Visible reports</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {visibleReports.length} report{visibleReports.length === 1 ? '' : 's'} in the current map view
                    </p>
                  </div>
                </div>

                {visibleReports.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleReports.map((report) => {
                      const severity = severityInfo[report.severity];

                      return (
                        <div
                          key={report.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`map-pin-large ${severity.className}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-950">{report.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{getReportLocation(report)}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                    report.severity === 'HIGH'
                                      ? 'bg-red-50 text-red-700 ring-red-600/20'
                                      : report.severity === 'MODERATE'
                                        ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                        : 'bg-green-50 text-green-700 ring-green-600/20'
                                  }`}
                                >
                                  {severity.label}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(report.reportedDate).toLocaleDateString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                    No reports in this map area. Drag the map to an area with pins.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

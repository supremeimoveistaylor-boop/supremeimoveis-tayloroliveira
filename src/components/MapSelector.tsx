import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapSelectorProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export const MapSelector = ({ latitude, longitude, onLocationSelect }: MapSelectorProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [lat, setLat] = useState<string>(latitude?.toString() || '-16.6869');
  const [lng, setLng] = useState<string>(longitude?.toString() || '-49.2648');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on Goiânia
    const initialLat = latitude || -16.6869;
    const initialLng = longitude || -49.2648;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add initial marker if coordinates provided
      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
      }

      // Add click event to map
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Update marker position
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else if (mapRef.current) {
          markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
        }

        // Update state and callback
        setLat(lat.toFixed(6));
        setLng(lng.toFixed(6));
        onLocationSelect(lat, lng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map when coordinates change from props
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.setView([latitude, longitude], 13);
      
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current);
      }
    }
  }, [latitude, longitude]);

  const handleManualInput = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.setView([latNum, lngNum], 13);

      if (markerRef.current) {
        markerRef.current.setLatLng([latNum, lngNum]);
      } else {
        markerRef.current = L.marker([latNum, lngNum]).addTo(mapRef.current);
      }

      onLocationSelect(latNum, lngNum);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="-16.6869"
          />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-49.2648"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleManualInput}
        className="w-full"
      >
        <MapPin className="mr-2 h-4 w-4" />
        Atualizar Marcador
      </Button>

      <div className="space-y-2">
        <Label>Selecione a localização no mapa</Label>
        <p className="text-sm text-muted-foreground">
          Clique no mapa para definir a localização do imóvel
        </p>
        <div 
          ref={mapContainerRef} 
          className="w-full h-[400px] rounded-lg border border-border"
          style={{ zIndex: 0 }}
        />
      </div>
    </div>
  );
};
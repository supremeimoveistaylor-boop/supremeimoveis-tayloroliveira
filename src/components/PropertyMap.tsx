import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price: number;
  purpose: string;
  property_type: string;
}

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  onPropertyClick?: (propertyId: string) => void;
}

export const PropertyMap = ({ 
  properties, 
  center = [-16.6869, -49.2648], // Goiânia coordinates
  zoom = 12,
  onPropertyClick 
}: PropertyMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Add markers for properties with coordinates
    properties.forEach((property) => {
      if (property.latitude && property.longitude && mapRef.current) {
        const marker = L.marker([property.latitude, property.longitude])
          .addTo(mapRef.current);

        const formatPrice = (price: number, purpose: string) => {
          const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(price);
          return purpose === 'rent' ? `${formatted}/mês` : formatted;
        };

        // Create popup content
        const popupContent = `
          <div class="min-w-[200px]">
            <h3 class="font-bold text-sm mb-1">${property.title}</h3>
            <p class="text-xs text-gray-600 mb-2">${property.location}</p>
            <p class="font-bold text-primary mb-2">${formatPrice(property.price, property.purpose)}</p>
            <button 
              class="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition-colors"
              onclick="window.dispatchEvent(new CustomEvent('propertyMarkerClick', { detail: '${property.id}' }))"
            >
              Ver Detalhes
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);
      }
    });

    // Handle property marker clicks
    const handleMarkerClick = (e: any) => {
      if (onPropertyClick) {
        onPropertyClick(e.detail);
      }
    };

    window.addEventListener('propertyMarkerClick', handleMarkerClick);

    return () => {
      window.removeEventListener('propertyMarkerClick', handleMarkerClick);
    };
  }, [properties, center, zoom, onPropertyClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[400px] rounded-lg shadow-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
};
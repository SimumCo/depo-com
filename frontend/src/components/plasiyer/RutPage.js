// Plasiyer - Rut (Route) Sayfası Bileşeni
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Phone, Navigation, Map, List, Clock, ShoppingBag, ChevronRight 
} from 'lucide-react';
import { PageHeader, EmptyState } from '../ui/DesignSystem';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered marker icon
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #f97316; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Open navigation in Google Maps
const openNavigation = (lat, lng) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
};

// Start full route navigation
const startFullNavigation = (customerLocations) => {
  if (customerLocations.length === 0) return;
  const waypoints = customerLocations.map(c => `${c.lat},${c.lng}`).join('|');
  const destination = customerLocations[customerLocations.length - 1];
  const origin = customerLocations[0];
  window.open(
    `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${waypoints}`,
    '_blank'
  );
};

// Rut Page Component
const RutPage = ({ todayCustomers }) => {
  const [viewMode, setViewMode] = useState('map');

  // Prepare customer locations
  const customerLocations = todayCustomers.map((customer, idx) => ({
    ...customer,
    lat: customer.location?.lat || 41.0082 + (idx * 0.01),
    lng: customer.location?.lng || 28.9784 + (idx * 0.01),
    district: customer.location?.district || '',
  }));

  // Calculate map center
  const defaultCenter = customerLocations.length > 0
    ? [
        customerLocations.reduce((sum, c) => sum + c.lat, 0) / customerLocations.length,
        customerLocations.reduce((sum, c) => sum + c.lng, 0) / customerLocations.length
      ]
    : [41.0082, 28.9784];

  // Route coordinates for polyline
  const routeCoords = customerLocations.map(c => [c.lat, c.lng]);

  return (
    <div className="space-y-4" data-testid="rut-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Bugunun Rutu"
          subtitle={`${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} - ${todayCustomers.length} nokta`}
        />
        <div className="flex items-center gap-2">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <button 
            onClick={() => startFullNavigation(customerLocations)} 
            disabled={customerLocations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Navigation className="w-4 h-4" />
            Navigasyonu Baslat
          </button>
        </div>
      </div>

      {/* Content */}
      {todayCustomers.length === 0 ? (
        <EmptyState 
          icon={MapPin} 
          title="Bugun icin planlanmis rut noktasi yok"
          subtitle="Rut gunleriniz: Pazartesi, Cuma"
        />
      ) : viewMode === 'map' ? (
        <MapView 
          customerLocations={customerLocations}
          defaultCenter={defaultCenter}
          routeCoords={routeCoords}
        />
      ) : (
        <ListView customers={todayCustomers} />
      )}
    </div>
  );
};

// View Mode Toggle
const ViewModeToggle = ({ viewMode, setViewMode }) => (
  <div className="flex bg-slate-100 rounded-xl p-1">
    <button 
      onClick={() => setViewMode('map')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
      }`}
    >
      <Map className="w-4 h-4" />
      Harita
    </button>
    <button 
      onClick={() => setViewMode('list')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
      }`}
    >
      <List className="w-4 h-4" />
      Liste
    </button>
  </div>
);

// Map View Component
const MapView = ({ customerLocations, defaultCenter, routeCoords }) => (
  <div className="grid grid-cols-3 gap-4">
    <div className="col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ height: 500 }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeCoords.length > 1 && (
          <Polyline 
            positions={routeCoords} 
            color="#f97316" 
            weight={3} 
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
        {customerLocations.map((customer, idx) => (
          <Marker 
            key={customer.id} 
            position={[customer.lat, customer.lng]}
            icon={createNumberedIcon(idx + 1)}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-slate-900">{customer.name}</p>
                <p className="text-xs text-slate-500">{customer.district || customer.address || 'Adres yok'}</p>
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 bg-emerald-500 text-white text-xs rounded hover:bg-emerald-600">
                    Ara
                  </button>
                  <button 
                    onClick={() => openNavigation(customer.lat, customer.lng)}
                    className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                  >
                    Yol Tarifi
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>

    {/* Customer List Panel */}
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {customerLocations.map((customer, idx) => (
        <CustomerMapCard 
          key={customer.id} 
          customer={customer} 
          index={idx}
        />
      ))}
    </div>
  </div>
);

// Customer Map Card (for map view sidebar)
const CustomerMapCard = ({ customer, index }) => (
  <div 
    className="bg-white border border-slate-200 rounded-xl p-3 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
    data-testid={`rut-point-${index}`}
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-sm truncate">{customer.name}</h3>
        <p className="text-xs text-slate-500 truncate">{customer.district || customer.address || 'Adres yok'}</p>
      </div>
      <button 
        onClick={() => openNavigation(customer.lat, customer.lng)}
        className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
      >
        <Navigation className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// List View Component
const ListView = ({ customers }) => (
  <div className="space-y-3">
    {customers.map((customer, idx) => (
      <CustomerListCard 
        key={customer.id} 
        customer={customer} 
        index={idx}
      />
    ))}
  </div>
);

// Customer List Card (for list view)
const CustomerListCard = ({ customer, index }) => (
  <div 
    className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all" 
    data-testid={`rut-point-${index}`}
  >
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-900">{customer.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{customer.code || `MUS-${customer.id?.slice(0, 5)}`}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
            {customer.channel || 'Perakende'}
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
          <MapPin className="w-4 h-4 text-slate-400" />
          {customer.address || 'Adres bilgisi yok'}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Son Siparis: 3 gun once
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Ort: 7 Gun
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-medium hover:bg-emerald-600 transition-colors">
          <Phone className="w-3.5 h-3.5" />
          Ara
        </button>
        <button 
          onClick={() => openNavigation(customer.location?.lat, customer.location?.lng)}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Yol Tarifi
        </button>
      </div>
    </div>
  </div>
);

export default RutPage;
export { createNumberedIcon, openNavigation, startFullNavigation };

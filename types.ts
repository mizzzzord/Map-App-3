export interface Marker {
  id: number;           // Изменяем на number для SQLite
  latitude: number;
  longitude: number;
  title?: string;
  created_at?: string;
}

export interface MarkerImage {
  id: number;           // Изменяем на number для SQLite
  marker_id: number;    // Изменяем на marker_id
  uri: string;
  created_at?: string;
}

export interface DatabaseContextType {
  // Маркеры
  addMarker: (latitude: number, longitude: number, title?: string) => Promise<number>;
  deleteMarker: (id: number) => Promise<void>;
  getMarkers: () => Promise<Marker[]>;
  
  // Изображения
  addImage: (markerId: number, uri: string) => Promise<number>;
  deleteImage: (id: number) => Promise<void>;
  getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;
  
  // Статусы
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface MapProps {
  markers: Marker[];
  onMarkerPress: (marker: Marker) => void;
  onLongPress: (event: any) => void;
}

export interface MarkerListProps {
  markers: Marker[];
  onMarkerPress: (marker: Marker) => void;
}

export interface ImageListProps {
  images: MarkerImage[];
  onDeleteImage: (imageId: number) => void;
  loading?: boolean;
}

export interface ActiveNotification {
  markerId: number;
  notificationId: string;
  timestamp: number;
}

export interface ImageListProps {
  images: MarkerImage[];
  onDeleteImage: (imageId: number) => void;
  loading?: boolean;
}
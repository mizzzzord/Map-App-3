import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker as MapMarker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Marker } from '../types';

interface MapProps {
  markers: Marker[];
  onMarkerPress: (marker: Marker) => void;
  onLongPress: (event: any) => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

export default function Map({ markers, onMarkerPress, onLongPress, userLocation }: MapProps) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 58.0105,
          longitude: 56.2502,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onLongPress={onLongPress}
        showsUserLocation={false} // Мы сами рисуем маркер пользователя
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={true}
      >
        {/* Маркеры пользователя */}
        {markers.map(marker => (
          <MapMarker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title || 'Метка'}
            description={`Координаты: ${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}`}
            onPress={() => onMarkerPress(marker)}
          />
        ))}

        {/* Текущее местоположение пользователя */}
        {userLocation && (
          <MapMarker
            coordinate={userLocation}
            title="Ваше местоположение"
            description="Текущая позиция"
            pinColor="#007AFF"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
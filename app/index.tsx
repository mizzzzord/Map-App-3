import { LocationObject } from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Map from '../components/Map';
import { useDatabase } from '../contexts/DatabaseContext';
import { LocationService } from '../services/location';
import { NotificationManager } from '../services/notifications';

// Порог расстояния для уведомлений (в метрах)
const PROXIMITY_THRESHOLD = 20;

export default function MapScreen() {
  const router = useRouter();
  const { markers, addMarker, deleteMarker, isLoading } = useDatabase();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [lastCheckedLocation, setLastCheckedLocation] = useState<LocationObject | null>(null);

  const notificationManager = NotificationManager.getInstance();

  // Инициализация отслеживания местоположения
  useEffect(() => {
    let isMounted = true;
    
    const initLocationTracking = async () => {
      try {
        console.log('🚀 Запускаем отслеживание местоположения...');
        setIsLocationLoading(true);

        // Запрашиваем разрешения
        const hasPermission = await LocationService.requestLocationPermissions();
        if (!hasPermission) {
          throw new Error('Разрешение на геолокацию не получено');
        }

        // Получаем текущую позицию
        const currentLocation = await LocationService.getCurrentPositionAsync();
        if (isMounted && currentLocation) {
          setUserLocation(currentLocation);
          setLastCheckedLocation(currentLocation);
          console.log('📍 Начальная позиция получена');
          
          // Сразу проверяем метки
          checkProximityToMarkers(currentLocation);
        }

        // Запускаем постоянное отслеживание
        const subscription = await LocationService.startLocationUpdates(
          (location) => {
            if (isMounted) {
              setUserLocation(location);
              
              // Проверяем метки при значительном перемещении
              if (shouldCheckLocation(location)) {
                setLastCheckedLocation(location);
                checkProximityToMarkers(location);
              }
            }
          }
        );

        if (isMounted && subscription) {
          console.log('✅ Отслеживание активно');
        }

      } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        if (isMounted) {
          setLocationError('Не удалось запустить геолокацию');
        }
      } finally {
        if (isMounted) {
          setIsLocationLoading(false);
        }
      }
    };

    initLocationTracking();

    return () => {
      isMounted = false;
    };
  }, []);

  // Определяем, нужно ли проверять метки для новой позиции
  const shouldCheckLocation = (newLocation: LocationObject): boolean => {
    if (!lastCheckedLocation) return true;
    
    const distance = LocationService.calculateDistance(
      lastCheckedLocation.coords.latitude,
      lastCheckedLocation.coords.longitude,
      newLocation.coords.latitude,
      newLocation.coords.longitude
    );
    
    return distance >= 2; // Проверяем если переместились на 2+ метра
  };

  // Проверка приближения к меткам
  const checkProximityToMarkers = useCallback((location: LocationObject) => {
    if (markers.length === 0) {
      console.log('📭 Нет меток для проверки');
      return;
    }

    console.log(`\n📍 ПРОВЕРКА МЕТОК (${markers.length} шт.)`);
    console.log(`📱 Моя позиция: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`);

    let nearMarkersCount = 0;

    markers.forEach(marker => {
      const distance = LocationService.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        marker.latitude,
        marker.longitude
      );

      console.log(`📏 "${marker.title}": ${distance.toFixed(1)}м`);

      if (distance <= PROXIMITY_THRESHOLD) {
        nearMarkersCount++;
        console.log(`🎯 НАХОДИТСЯ В РАДИУСЕ ${PROXIMITY_THRESHOLD}м!`);
        notificationManager.showNotification(marker);
      }
    });

    if (nearMarkersCount > 0) {
      console.log(`✅ Найдено ${nearMarkersCount} меток рядом`);
    } else {
      console.log('❌ Рядом нет меток');
    }
  }, [markers]);

  const handleMapLongPress = async (event: any) => {
    if (isAddingMarker) return;
    
    const { coordinate } = event.nativeEvent;
    setIsAddingMarker(true);
    
    try {
      console.log('🔄 Создаем новую метку...');
      
      const newMarkerId = await addMarker(
        coordinate.latitude, 
        coordinate.longitude, 
        `Метка ${markers.length + 1}`
      );

      console.log('✅ Метка создана, ID:', newMarkerId);
      
      // Сразу проверяем, не рядом ли мы с новой меткой
      if (userLocation) {
        setTimeout(() => {
          checkProximityToMarkers(userLocation);
        }, 1000);
      }

      Alert.alert(
        '✅ Метка добавлена', 
        `Создана метка в точке:\n${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Ошибка создания метки:', error);
      Alert.alert('Ошибка', 'Не удалось добавить метку');
    } finally {
      setIsAddingMarker(false);
    }
  };

  const handleMarkerPress = (marker: any) => {
    setSelectedMarker(marker);
    console.log(`📍 Выбрана метка: "${marker.title}"`);
  };

  const handleMarkerCalloutPress = (marker: any) => {
    router.push({
      pathname: '/marker/[id]',
      params: {
        id: marker.id.toString(),
        latitude: marker.latitude,
        longitude: marker.longitude,
        title: marker.title || 'Метка',
      },
    });
  };

  const handleDeleteMarker = () => {
    if (!selectedMarker) return;

    Alert.alert(
      'Удалить метку',
      `Удалить метку "${selectedMarker.title || 'Метка'}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarker(selectedMarker.id);
              setSelectedMarker(null);
              Alert.alert('Успех', 'Метка удалена');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить метку');
            }
          },
        },
      ]
    );
  };

  const testNotification = async () => {
    console.log('🔔 ЗАПУСК ТЕСТА УВЕДОМЛЕНИЙ...');
    await notificationManager.testNotification();
  };

  const forceCheckMarkers = () => {
    if (userLocation) {
      console.log('🔍 ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА МЕТОК...');
      checkProximityToMarkers(userLocation);
    } else {
      Alert.alert('Ошибка', 'Местоположение не определено');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка карты...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Map
        markers={markers}
        onMarkerPress={handleMarkerPress}
        onLongPress={handleMapLongPress}
        userLocation={userLocation ? {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude
        } : null}
      />

      {/* Информационная панель */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>🗺️ Карта меток</Text>
        <Text style={styles.infoText}>
          Меток: {markers.length} | Радиус: {PROXIMITY_THRESHOLD}м
        </Text>
        
        {/* Статус местоположения */}
        <View style={styles.statusContainer}>
          {isLocationLoading ? (
            <>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.statusText}>Определяем местоположение...</Text>
            </>
          ) : locationError ? (
            <Text style={styles.errorText}>❌ {locationError}</Text>
          ) : userLocation ? (
            <Text style={styles.successText}>📍 Геолокация активна</Text>
          ) : (
            <Text style={styles.warningText}>⚠️ Местоположение недоступно</Text>
          )}
        </View>

        <Text style={styles.helpText}>
          {isAddingMarker ? '🔄 Создаем метку...' : '📍 Долгое нажатие - добавить метку'}
        </Text>

        {/* Кнопки тестирования */}
        <View style={styles.testButtons}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={testNotification}
          >
            <Text style={styles.testButtonText}>🔔 Тест уведомления</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.checkButton} 
            onPress={forceCheckMarkers}
          >
            <Text style={styles.checkButtonText}>🔍 Проверить метки</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Панель действий для выбранной метки */}
      {selectedMarker && (
        <View style={styles.actionPanel}>
          <Text style={styles.actionTitle}>📍 {selectedMarker.title || 'Метка'}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.detailsButton} 
              onPress={() => handleMarkerCalloutPress(selectedMarker)}
            >
              <Text style={styles.detailsButtonText}>📋 Детали</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteMarker}
            >
              <Text style={styles.deleteButtonText}>🗑️ Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  testButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  checkButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  actionPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
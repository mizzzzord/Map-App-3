import * as Location from 'expo-location';
import { LocationAccuracy, LocationObject, LocationSubscription } from 'expo-location';

export interface LocationConfig {
  accuracy: LocationAccuracy;
  timeInterval: number;
  distanceInterval: number;
}

export class LocationService {
  static async requestLocationPermissions(): Promise<boolean> {
    try {
      console.log('📍 Запрашиваем разрешения на геолокацию...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Статус разрешений геолокации:', status);
      return status === 'granted';
    } catch (error) {
      console.error('❌ Ошибка запроса разрешений геолокации:', error);
      return false;
    }
  }

  static async getCurrentPositionAsync(): Promise<LocationObject | null> {
    try {
      console.log('📍 Получаем текущую позицию...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      console.log('📍 Текущая позиция получена:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
      return location;
    } catch (error) {
      console.error('❌ Ошибка получения местоположения:', error);
      return null;
    }
  }

  static async startLocationUpdates(
    onLocation: (location: LocationObject) => void,
    config: LocationConfig = {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 3000,
      distanceInterval: 2
    }
  ): Promise<LocationSubscription | null> {
    try {
      console.log('📍 Запускаем отслеживание местоположения...');
      
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        throw new Error('Доступ к местоположению не разрешён');
      }

      const subscription = await Location.watchPositionAsync(
        config,
        (location) => {
          console.log('📍 Обновление позиции:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy
          });
          onLocation(location);
        }
      );

      console.log('✅ Отслеживание местоположения запущено');
      return subscription;
    } catch (error) {
      console.error('❌ Ошибка запуска отслеживания:', error);
      return null;
    }
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Расстояние в метрах
    return distance;
  }

  static async testService(): Promise<boolean> {
    try {
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) return false;

      const location = await this.getCurrentPositionAsync();
      return location !== null;
    } catch (error) {
      console.error('❌ Тест сервиса геолокации не пройден:', error);
      return false;
    }
  }
}
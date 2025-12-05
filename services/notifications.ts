import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { Marker } from '../types';

export interface ActiveNotification {
  markerId: number;
  timestamp: number;
}

export class NotificationManager {
  private activeNotifications: Map<number, ActiveNotification>;
  private static instance: NotificationManager;
  private useAlerts: boolean = false;

  private constructor() {
    this.activeNotifications = new Map();
    this.setupNotificationHandler();
    this.useAlerts = Platform.OS === 'ios' || Platform.OS === 'android';
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private setupNotificationHandler(): void {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.log('📢 Используем Alert вместо уведомлений');
    }
  }

  async showNotification(marker: Marker): Promise<void> {
    try {
      // Проверяем, не было ли уведомления в последние 30 секунд
      const existingNotification = this.activeNotifications.get(marker.id);
      if (existingNotification) {
        const timeSinceLastNotification = Date.now() - existingNotification.timestamp;
        if (timeSinceLastNotification < 30000) { // 30 секунд
          console.log(`⏰ Пропускаем уведомление для метки ${marker.id}`);
          return;
        }
      }

      console.log(`🚨 ПОКАЗЫВАЕМ УВЕДОМЛЕНИЕ: "${marker.title}"`);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Вы рядом с меткой! 📍",
            body: `Вы приблизились к "${marker.title || 'Метке'}"`,
            sound: true,
            data: { markerId: marker.id },
          },
          trigger: null,
        });
        console.log('✅ Нативное уведомление показано');
      } catch (notificationError) {
        console.log('📢 Используем Alert вместо уведомления');
        Alert.alert(
          "📍 Вы рядом с меткой!",
          `Вы приблизились к "${marker.title || 'Метке'}"`,
          [{ text: "OK", style: "default" }]
        );
      }

      // Сохраняем информацию об активном уведомлении
      this.activeNotifications.set(marker.id, {
        markerId: marker.id,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Ошибка при показе уведомления:', error);
      // Всегда показываем Alert как запасной вариант
      Alert.alert(
        "📍 Вы рядом с меткой!",
        `Вы приблизились к "${marker.title || 'Метке'}"`,
        [{ text: "OK", style: "default" }]
      );
    }
  }

  async removeNotification(markerId: number): Promise<void> {
    this.activeNotifications.delete(markerId);
  }

  clearAllNotifications(): void {
    this.activeNotifications.clear();
  }

  // Метод для принудительного тестирования уведомлений
  async testNotification(): Promise<void> {
    const testMarker: Marker = {
      id: 999,
      latitude: 58.0105,
      longitude: 56.2502,
      title: 'Тестовая метка'
    };

    console.log('🔔 ТЕСТИРУЕМ УВЕДОМЛЕНИЕ...');
    await this.showNotification(testMarker);
  }
}
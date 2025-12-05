import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDatabase } from '../../contexts/DatabaseContext';

export default function MarkerDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { images, addImage, deleteImage, deleteMarker } = useDatabase();
  
  const [markerImages, setMarkerImages] = useState<any[]>([]);
  const [markerTitle, setMarkerTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const markerId = parseInt(params.id as string);
  const latitude = parseFloat(params.latitude as string);
  const longitude = parseFloat(params.longitude as string);
  const initialTitle = params.title as string;

  useEffect(() => {
    setMarkerTitle(initialTitle || 'Метка');
    // Фильтруем изображения для текущего маркера
    const filteredImages = images.filter(img => img.marker_id === markerId);
    setMarkerImages(filteredImages);
  }, [images, markerId, initialTitle]);

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешение требуется', 'Нужно разрешение для доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIsLoading(true);
        await addImage(markerId, result.assets[0].uri);
        Alert.alert('Успех', 'Изображение добавлено!');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить изображение');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    Alert.alert(
      'Удалить изображение',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await deleteImage(imageId);
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const handleDeleteMarker = () => {
    Alert.alert(
      'Удалить метку',
      `Вы уверены, что хотите удалить метку "${markerTitle}" и все её изображения?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteMarker(markerId);
              Alert.alert('Успех', 'Метка удалена');
              router.back();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить метку');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditTitle = () => {
    setNewTitle(markerTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (newTitle.trim()) {
      setMarkerTitle(newTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
  };

  const handleBack = () => {
    router.back();
  };

  if (isNaN(markerId)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ошибка параметров</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.markerInfo}>
        <View style={styles.titleContainer}>
          <Text style={styles.markerTitle}>{markerTitle}</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.editButton} onPress={handleEditTitle}>
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteMarkerButton} onPress={handleDeleteMarker}>
              <Text style={styles.deleteMarkerButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.coordinates}>
          Координаты: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
        <Text style={styles.markerId}>ID: {markerId}</Text>
      </View>

      <View style={styles.imagesSection}>
        <View style={styles.imagesHeader}>
          <Text style={styles.imagesTitle}>Изображения ({markerImages.length})</Text>
          <TouchableOpacity 
            style={[styles.addButton, isLoading && styles.disabledButton]} 
            onPress={handleAddImage}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {isLoading ? '...' : '+ Добавить'}
            </Text>
          </TouchableOpacity>
        </View>

        {markerImages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Нет изображений</Text>
            <Text style={styles.emptyStateSubtext}>Нажмите "Добавить"</Text>
          </View>
        ) : (
          <ScrollView style={styles.imagesList}>
            {markerImages.map((image) => (
              <View key={image.id} style={styles.imageItem}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <View style={styles.imageInfo}>
                  <Text style={styles.imageDate}>
                    {image.created_at ? new Date(image.created_at).toLocaleDateString() : ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteImage(image.id)}
                  >
                    <Text style={styles.deleteButtonText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={isEditingTitle} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Изменить название</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Название метки"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveTitle}>
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  markerInfo: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 18,
  },
  deleteMarkerButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteMarkerButtonText: {
    fontSize: 18,
  },
  coordinates: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  markerId: {
    fontSize: 14,
    color: '#999',
  },
  imagesSection: {
    flex: 1,
    margin: 16,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  imagesList: {
    flex: 1,
  },
  imageItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 200,
  },
  imageInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 6,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    margin: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // ----------------------------------
  // Get user location
  // ----------------------------------
  const getUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to select a location."
      );
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});

    setLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  // ----------------------------------
  // Reset form after submit
  // ----------------------------------
  const resetForm = async () => {
    setTitle("");
    setDescription("");
    await getUserLocation();
  };

  // ----------------------------------
  // Submit report
  // ----------------------------------
  const submitReport = async () => {
    if (!title || !description || !location) {
      Alert.alert(
        "Missing fields",
        "Please fill all fields and select a location."
      );
      return;
    }

    try {
      const res = await fetch(
        "http://10.160.107.203:4000/dashboard/reports/by-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "usernamenigian@gmail.com",
            title,
            description,
            mediaType: "TEXT",
            mediaUrl: "N/A",
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        }
      );

      const text = await res.text();
      console.log("SERVER RESPONSE:", text);

      if (!res.ok) throw new Error(text || "Failed to create report");

      Alert.alert("Success", "Report submitted successfully!");

      setModalVisible(false);
      await resetForm();
    } catch (err: any) {
      Alert.alert("Error", err.message);
      console.log(err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Add Report Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>➕ Add Report</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>New Report</Text>

            {/* Title */}
            <TextInput
              placeholder="Title"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <TextInput
              placeholder="Description"
              placeholderTextColor="#94a3b8"
              style={[styles.input, { height: 80 }]}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* Map Picker */}
            <Text style={styles.label}>Select Location:</Text>

            {modalVisible && location && (
              <MapView
                style={styles.map}
                region={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => setLocation(e.nativeEvent.coordinate)}
              >
                <Marker
                  coordinate={location}
                  draggable
                  onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
                />
              </MapView>
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ef4444" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#10b981" }]}
                onPress={submitReport}
              >
                <Text style={styles.modalBtnText}>Submit</Text>
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
    backgroundColor: "#0f172a",
  },

  addButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "center",
    padding: 20,
  },

  modalContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },

  input: {
    backgroundColor: "#0f172a",
    color: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  label: {
    color: "white",
    marginBottom: 6,
    fontWeight: "600",
  },

  map: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginBottom: 10,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },

  modalBtnText: {
    color: "white",
    fontWeight: "600",
  },
});
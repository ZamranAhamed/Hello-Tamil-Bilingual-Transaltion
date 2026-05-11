import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../../../services/api";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";

type MentorNote = {
  _id: string;
  heading: string;
  content: string;
  createdAt: string;
};

export default function MentorNotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<MentorNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [heading, setHeading] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const NOTES_KEY = 'mentor_notes';

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(NOTES_KEY);
      const data: MentorNote[] = stored ? JSON.parse(stored) : [];
      setNotes(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Error fetching notes:", error);
      Alert.alert("Error", "Could not load mentor notes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await AsyncStorage.getItem("isAdminAuthenticated");
        const timestampStr = await AsyncStorage.getItem("adminAuthTimestamp");
        if (auth !== "true" || !timestampStr) {
          router.replace("/modules/bilingual_translation/admin/adminLogin");
          return;
        }
        const timestamp = parseInt(timestampStr, 10);
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          await AsyncStorage.removeItem("isAdminAuthenticated");
          router.replace("/modules/bilingual_translation/admin/adminLogin");
        }
      } catch (error) {
        router.replace("/modules/bilingual_translation/admin/adminLogin");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const resetForm = () => {
    setHeading("");
    setContent("");
    setIsEditing(false);
    setCurrentEditId(null);
  };

  const handleSaveNote = async () => {
    if (!heading.trim() || !content.trim()) {
      Alert.alert("Validation", "Please provide a heading and content.");
      return;
    }

    setIsSubmitting(true);
    try {
      const stored = await AsyncStorage.getItem(NOTES_KEY);
      const existing: MentorNote[] = stored ? JSON.parse(stored) : [];

      if (isEditing && currentEditId) {
        const updated = existing.map(n =>
          n._id === currentEditId ? { ...n, heading, content } : n
        );
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
      } else {
        const newNote: MentorNote = {
          _id: Date.now().toString() + Math.random().toString(36).substring(7),
          heading,
          content,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify([...existing, newNote]));
      }

      await fetchNotes();
      resetForm();
    } catch (error) {
      console.error("Error saving note:", error);
      Alert.alert("Error", "Could not save the mentor note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInit = (note: MentorNote) => {
    setHeading(note.heading);
    setContent(note.content);
    setCurrentEditId(note._id);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const stored = await AsyncStorage.getItem(NOTES_KEY);
            const existing: MentorNote[] = stored ? JSON.parse(stored) : [];
            const updated = existing.filter(n => n._id !== id);
            await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
            await fetchNotes();
          } catch (error) {
            console.error("Error deleting note:", error);
            Alert.alert("Error", "Could not delete mentor note");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            playButtonClick();
            router.replace("/modules/bilingual_translation/admin/adminDashboard");
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.navy} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Mentor Notes</Text>
      </View>

      {/* Form Area */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          {isEditing ? "Edit Note" : "Create New Note"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Heading"
          placeholderTextColor="#9CA3AF"
          value={heading}
          onChangeText={setHeading}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Content"
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.buttonRow}>
          {isEditing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                playButtonClick();
                resetForm();
              }}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              isSubmitting ? styles.saveButtonDisabled : null,
            ]}
            onPress={() => {
              playButtonClick();
              void handleSaveNote();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? "Update Note" : "Save Note"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Existing Notes</Text>

      {/* Notes List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 20 }} />
      ) : notes.length === 0 ? (
        <Text style={styles.emptyText}>No mentor notes found. Create one above!</Text>
      ) : (
        notes.map((note) => (
          <View key={note._id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteHeading}>{note.heading}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => {
                    playButtonClick();
                    handleEditInit(note);
                  }}
                  style={styles.iconButton}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <MaterialCommunityIcons name="pencil" size={20} color={COLORS.teal} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    playButtonClick();
                    handleDelete(note._id);
                  }}
                  style={styles.iconButton}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
            <Text style={styles.noteContent}>{note.content}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.navy,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.navy,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.navy,
    marginBottom: 16,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.navy,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.navy,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  saveButton: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  cancelButtonText: {
    color: COLORS.navy,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  noteCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  noteHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.navy,
    flex: 1,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
    elevation: 10,
  },
  iconButton: {
    padding: 4,
  },
  noteDate: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 12,
  },
  noteContent: {
    fontSize: 15,
    color: COLORS.navy,
    lineHeight: 22,
  },
});

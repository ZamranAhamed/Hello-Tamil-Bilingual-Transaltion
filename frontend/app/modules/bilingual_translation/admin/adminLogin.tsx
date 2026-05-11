import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  PanResponder,
  Animated,
  Vibration,
  TouchableOpacity,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [pattern, setPattern] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(20);
  type Phase = "show" | "memorize" | "draw";
  const [phase, setPhase] = useState<Phase>("show");

  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [correctPattern, setCorrectPattern] = useState<number[]>([]);
  const [visiblePattern, setVisiblePattern] = useState<number[]>([]);

  const generateNewPattern = () => {
    // Generate exactly 4 dots for easiest memorization
    const length = 4;
    const available = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const newPattern: number[] = [];
    
    const crossOvers: Record<string, number> = {
      "1-3": 2, "3-1": 2,
      "4-6": 5, "6-4": 5,
      "7-9": 8, "9-7": 8,
      "1-7": 4, "7-1": 4,
      "2-8": 5, "8-2": 5,
      "3-9": 6, "9-3": 6,
      "1-9": 5, "9-1": 5,
      "3-7": 5, "7-3": 5,
    };

    for (let i = 0; i < length; i++) {
      let validChoices = available.slice();
      
      if (newPattern.length > 0) {
        const last = newPattern[newPattern.length - 1];
        validChoices = validChoices.filter(choice => {
          const mid = crossOvers[`${last}-${choice}`];
          // Valid if no crossover, or the crossover node is already selected
          return !mid || newPattern.includes(mid);
        });
      }

      // Failsafe mostly impossible, but clean
      if (validChoices.length === 0) break;

      const idx = Math.floor(Math.random() * validChoices.length);
      const chosen = validChoices[idx];
      newPattern.push(chosen);
      available.splice(available.indexOf(chosen), 1);
    }

    // Failsafe recursively rerun if we get stuck early
    if (newPattern.length < 4) {
      return generateNewPattern();
    }

    setCorrectPattern(newPattern);
    setPhase("show");
    setTimeLeft(20);
    setPattern([]);
    setVisiblePattern([]);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const timestampStr = await AsyncStorage.getItem("adminAuthTimestamp");
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          const now = Date.now();
          if (now - timestamp < 5 * 60 * 1000) {
            router.replace("/modules/bilingual_translation/admin/adminDashboard" as any);
            return;
          }
        }
      } catch (e) {
        console.error("Storage error:", e);
      }
      generateNewPattern();
    };
    checkAuth();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let fadeOutTimer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    if (phase === "show" && correctPattern.length > 0) {
      setVisiblePattern([correctPattern[0]]); // Initialize with first point immediately
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      Vibration.vibrate(50);

      let step = 1;
      // Animate dots one by one + draw lines progressively every 300ms
      interval = setInterval(() => {
        if (step < correctPattern.length) {
          setVisiblePattern(correctPattern.slice(0, step + 1));
          // Optional sound per node if requested in future, omitted for now
          step++;
        } else {
          clearInterval(interval);
          
          // Complete -> Wait 2.5 seconds (2500ms) before fading output and switching to memorize
          fadeOutTimer = setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start();
          }, 2100); // 2500ms - 400ms duration = 2100ms delay to start fade out

          timer = setTimeout(() => {
            setPhase("memorize");
          }, 2500);
        }
      }, 300);

    } else if (phase === "memorize" || phase === "draw") {
      fadeAnim.setValue(0);
      setVisiblePattern([]);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            generateNewPattern();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOutTimer);
      clearInterval(interval);
    };
  }, [phase, correctPattern, fadeAnim]);

  const [dots, setDots] = useState<{ id: number; x: number; y: number }[]>([]);
  const dotsRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const [activePoint, setActivePoint] = useState<{ x: number; y: number } | null>(null);

  const getNumberFromCoordinates = (x: number, y: number): number | null => {
    for (const dot of dotsRef.current) {
      const dist = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      if (dist < 40) {
        return dot.id;
      }
    }
    return null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === "memorize",
      onMoveShouldSetPanResponder: () => phaseRef.current === "memorize" || phaseRef.current === "draw",
      onPanResponderGrant: (evt) => {
        if (phaseRef.current !== "memorize") return;
        setPhase("draw");
        const { locationX, locationY } = evt.nativeEvent;
        const num = getNumberFromCoordinates(locationX, locationY);
        setActivePoint({ x: locationX, y: locationY });
        if (num) {
          playButtonClick();
          setPattern([num]);
        } else {
          setPattern([]);
        }
      },
      onPanResponderMove: (evt) => {
        if (phaseRef.current === "show") return;
        const { locationX, locationY } = evt.nativeEvent;
        setActivePoint({ x: locationX, y: locationY });
        const num = getNumberFromCoordinates(locationX, locationY);
        if (num) {
          setPattern((prev) => {
            if (!prev.includes(num)) {
              playButtonClick();
              return [...prev, num];
            }
            return prev;
          });
        }
      },
      onPanResponderRelease: () => {
        if (phaseRef.current === "show") return;
        setActivePoint(null);
        
        // Anti-softlock: If they let go without hitting anything, reset them to memorize so they can restart
        if (phaseRef.current === "draw") {
          setPattern((prev) => {
            if (prev.length === 0) setPhase("memorize");
            return prev;
          });
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPattern([]);
  };

  const handleLogin = async () => {
    if (pattern.length === 0) return;

    const enteredPattern = pattern.join("");
    const targetPattern = correctPattern.join("");

    if (enteredPattern === targetPattern) {
      try {
        await AsyncStorage.setItem("isAdminAuthenticated", "true");
        await AsyncStorage.setItem("adminAuthTimestamp", Date.now().toString());
        Alert.alert("Success", "Pattern matched successfully!");
        // Using Href object to ensure absolute resolution across root contexts
        router.replace("/modules/bilingual_translation/admin/adminDashboard" as any);
      } catch (e) {
        console.error("Storage error:", e);
        Alert.alert("Error", "Routing failed");
      }
    } else {
      Alert.alert("Wrong pattern!", "Try again");
      generateNewPattern();
    }
  };

  useEffect(() => {
    if (activePoint === null && pattern.length > 0 && phase === "draw") {
      void handleLogin();
    }
  }, [activePoint]);

  const displayPattern = phase === "show" ? visiblePattern : pattern;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.card}>
          <Text style={styles.title}>🔐 Mentor Pattern Login</Text>
          <Text style={styles.subtitle}>Remember and draw the pattern</Text>
          {phase === "show" ? (
            <Animated.View style={{ alignItems: "center", marginBottom: 24, opacity: fadeAnim }}>
              <Text style={{ fontSize: 16, color: COLORS.navy, marginBottom: 8, fontWeight: "600" }}>
                Memorize this pattern!
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.teal, textAlign: "center" }}>
                {correctPattern.join(" → ")}
              </Text>
            </Animated.View>
          ) : (
            <Text style={styles.timerText}>Time Left: {timeLeft}s</Text>
          )}

          <View style={styles.gridContainer} {...panResponder.panHandlers}>
            {/* SVG overlay to draw connections */}
            <Svg height="270" width="270" style={StyleSheet.absoluteFill}>
              {displayPattern.map((num, i) => {
                if (i === 0) return null;
                const prev = dots.find(d => d.id === displayPattern[i - 1]);
                const curr = dots.find(d => d.id === num);
                if (!prev || !curr) return null;
                return (
                  <Line
                    key={`line-${i}`}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke="#4FD1C5"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Dragging line */}
              {phase === "draw" && activePoint && displayPattern.length > 0 && (() => {
                const lastDot = dots.find(d => d.id === displayPattern[displayPattern.length - 1]);
                if (!lastDot) return null;
                return (
                  <Line
                    x1={lastDot.x}
                    y1={lastDot.y}
                    x2={activePoint.x}
                    y2={activePoint.y}
                    stroke="#4FD1C5"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeOpacity="0.5"
                  />
                );
              })()}
            </Svg>

            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const isSelected = displayPattern.includes(num);
              return (
                <View
                  key={num}
                  style={[
                    styles.circle,
                    isSelected && styles.circleSelected,
                  ]}
                  pointerEvents="none"
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    
                    if (!dotsRef.current.find((d) => d.id === num)) {
                      const newDot = { id: num, x: centerX, y: centerY };
                      dotsRef.current = [...dotsRef.current, newDot];
                      setDots([...dotsRef.current]);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.innerDot,
                      isSelected && styles.innerDotSelected,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    padding: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: COLORS.navy,
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.navy,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E53E3E",
    textAlign: "center",
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    width: 270,
    height: 270,
    alignSelf: "center",
    marginBottom: 20,
    position: "relative",
  },
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circleSelected: {
    backgroundColor: "#4FD1C5",
  },
  innerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1E293B",
  },
  innerDotSelected: {
    backgroundColor: "#FFFFFF",
  },
  clearButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  clearButtonText: {
    color: COLORS.teal,
    fontWeight: "bold",
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

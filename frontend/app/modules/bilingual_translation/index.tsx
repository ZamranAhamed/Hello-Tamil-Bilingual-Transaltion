import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, BackHandler, Platform, Animated, Easing, Dimensions, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useNimo from "./hooks/useNimo";
import NimoAssistant from "./components/NimoAssistant";
import { playIntro } from "./services/nimoAudioService";
import { playButtonClick } from "./services/soundService";
import { playMenuMusic, stopMusic, toggleMute, getMuteState, initAudio } from "./services/musicService";
import { initLanguageMode, toggleLanguageMode, getLanguageMode, LanguageMode } from "./services/languageModeService";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const FloatingBubbles = () => {
  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    const size = Math.random() * 60 + 40;
    const left = Math.random() * width;
    const animation = useRef(new Animated.Value(0)).current;
    const duration = Math.random() * 5000 + 10000;
    const delay = Math.random() * 5000;

    const colors = ["#A0C4FF", "#FDFFB6", "#FFADAD", "#CAFFBF"];
    const color = colors[i % colors.length];

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: duration,
            delay: delay,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    }, [animation, duration, delay]);

    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [height, -100],
    });

    return (
      <Animated.View
        key={i}
        style={{
          position: "absolute",
          left: left,
          transform: [{ translateY }],
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
    );
  });

  return (
    <View style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }} pointerEvents="none">
      {bubbles}
    </View>
  );
};

const FloatingNimo = ({ isIntroVisible }: { isIntroVisible: boolean }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 90,
        height: 90,
        transform: [{ translateY }],
        zIndex: 10,
        opacity: isIntroVisible ? 0 : 1,
      }}
      pointerEvents={isIntroVisible ? "none" : "auto"}
    >
      <Animated.Image
        source={require("../../../assets/images/nimo_blue_happy.png")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const AnimatedCard = ({ children, onPress, style }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function BilingualTranslationHome() {
  const router = useRouter();
  const { emotion, subtitle, visible, showHappyMessage } = useNimo();
  const [dailyStreak, setDailyStreak] = useState(0);
  const [isMuted, setIsMuted] = useState(getMuteState());
  const [langMode, setLangMode] = useState<LanguageMode>('T2S');
  const [isSwitchingLang, setIsSwitchingLang] = useState(false);

  useEffect(() => {
    const loadStreak = async () => {
      try {
        const streakJson = await AsyncStorage.getItem("daily_streak");
        if (streakJson) {
          const parsed = JSON.parse(streakJson);
          setDailyStreak(parsed.count || 0);
        }
      } catch (error) {
        console.warn("Failed to load streak", error);
      }
    };
    loadStreak();
  }, []);

  useEffect(() => {
    const setupAudio = async () => {
      const muted = await initAudio();
      setIsMuted(muted);
    };
    setupAudio();
    
    const setupLang = async () => {
      const mode = await initLanguageMode();
      setLangMode(mode);
    };
    setupLang();
  }, []);

  const handleToggleMute = async () => {
    const newMutedState = await toggleMute();
    setIsMuted(newMutedState);
  };

  const handleToggleLangMode = async () => {
    if (isSwitchingLang) return;
    setIsSwitchingLang(true);
    // Simulate loading delay for the animation
    setTimeout(async () => {
      const newMode = await toggleLanguageMode();
      setLangMode(newMode);
      setIsSwitchingLang(false);
    }, 800);
  };

  // Show Nimo introduction only on first visit
  useEffect(() => {
    const checkIntro = async () => {
      try {
        const seen = await AsyncStorage.getItem("nimo_intro_seen");
        if (!seen) {
          showHappyMessage(
            "ආයුබෝවන්! මම නිමෝ.\n\nඅපි එකට தமிழ் ඉගෙන ගමු!\n\nමෙතන රසවත් ක්රීඩා ගොඩක් තියෙනවා.\nහරි පිළිතුරු තෝරා\nනව தமிழ் වචන ඉගෙන ගන්න පුළුවන්.\n\nඑහෙනම් අපි ආරම්භ කරමු!",
            "Hello! I'm Nimo. Let's learn Tamil together!",
            12000
          );
          playIntro();
          await AsyncStorage.setItem("nimo_intro_seen", "true");
        }
      } catch (error) {
        console.warn("Failed to check Nimo intro flag:", error);
      }
    };
    checkIntro();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsMuted(getMuteState());
      setLangMode(getLanguageMode());
      // Start menu music every time the screen comes into focus.
      // musicService inherently prevents restarting if 'menu' is already playing.
      void playMenuMusic();

      return () => {
        // We do NOT strictly stopMusic() on blur here anymore.
        // The game screens (wordhunt, picturequiz, etc.) will call stopMusic()
        // or playGameMusic() themselves when they mount. This allows the 
        // music to play continuously while transitioning to the Games Menu.
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const onBackPress = () => {
        router.replace("/" as any);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  const options = [
    {
      title: "Games",
      description: "Play fun games to learn Tamil translations",
      emoji: "🎮",
      pathname: "/modules/bilingual_translation/games",
    },
    {
      title: "Activity",
      description: "Practice translation activities",
      emoji: "📊",
      pathname: "/modules/bilingual_translation/activity/activityLog",
    },
    {
      title: "Mentor Access",
      description: "Admin dashboard for mentors",
      emoji: "🔐",
      pathname: "/modules/bilingual_translation/admin/adminLogin",
    },
  ];

  const optionBorderColors = [COLORS.teal, COLORS.yellow, COLORS.navy];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FloatingBubbles />
      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <LinearGradient
          colors={["#4FD1C5", "#63B3ED"]}
          style={{
            paddingVertical: 30, // Changed from fixed height
            justifyContent: "center",
            alignItems: "center",
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            marginBottom: 32,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "white",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Learn Tamil the Fun Way!
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "white",
              textAlign: "center",
              opacity: 0.9,
              marginBottom: 20, // Added margin below text
            }}
          >
            Play games and discover new words
          </Text>

          {/* Moved Top Bar into the blue gradient header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: '#333' }}>{dailyStreak}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={handleToggleLangMode} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, justifyContent: 'center', minWidth: 50, alignItems: 'center' }}>
                {isSwitchingLang ? (
                  <ActivityIndicator size="small" color="#4FD1C5" />
                ) : (
                  <Text style={{ fontWeight: 'bold', color: '#4FD1C5', fontSize: 16 }}>{langMode === 'T2S' ? 'T➔S' : 'S➔T'}</Text>
                )}
              </Pressable>
              <Pressable onPress={handleToggleMute} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 10, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                <MaterialCommunityIcons name={isMuted ? "volume-off" : "volume-high"} size={26} color="#333" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Options */}
          {options.map((option, index) => (
            <AnimatedCard
              key={index}
              onPress={() => {
                playButtonClick();
                router.push(option.pathname as any);
              }}
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                borderLeftWidth: 5,
                borderLeftColor: optionBorderColors[index] || COLORS.teal,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 5,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F2F7FF",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: COLORS.navy,
                      marginBottom: 6,
                    }}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.text,
                    }}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          ))}

          <Pressable
            onPress={() => {
              router.replace("/" as any);
            }}
            style={({ pressed }) => ({
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: COLORS.teal,
              opacity: pressed ? 0.8 : 1,
              borderRadius: 25,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 16,
            })}
          >
            <Text
              style={{
                color: COLORS.teal,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Back to Main Home
            </Text>
          </Pressable>
        </View>

        <NimoAssistant emotion={emotion} subtitle={subtitle} visible={visible} />
      </ScrollView>
      <FloatingNimo isIntroVisible={visible} />
    </View>
  );
}

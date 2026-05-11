import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, BackHandler, Platform, Animated, Easing, Dimensions, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../../constants/colors";
import { playButtonClick } from "../services/soundService";
import { playMenuMusic, toggleMute, getMuteState, initAudio } from "../services/musicService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { initLanguageMode, toggleLanguageMode, getLanguageMode, LanguageMode } from "../services/languageModeService";

const { width, height } = Dimensions.get("window");

const FloatingBubbles = () => {
  const bubbles = Array.from({ length: 10 }).map((_, i) => {
    const size = Math.random() * 50 + 30; // Different sizes
    const left = Math.random() * width;
    const animation = useRef(new Animated.Value(0)).current;
    const duration = Math.random() * 6000 + 12000;
    const delay = Math.random() * 4000;

    const colors = ["#A0C4FF", "#FDFFB6", "#FFADAD", "#CAFFBF"]; // Pastel colors
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
          opacity: 0.2, // background opacity 0.2
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

const FloatingSparkles = () => {
    const sparkles = Array.from({ length: 15 }).map((_, i) => {
      const top = Math.random() * height;
      const left = Math.random() * width;
      const animation = useRef(new Animated.Value(0)).current;
      const duration = Math.random() * 2000 + 2000;
      const delay = Math.random() * 2000;
  
      useEffect(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(animation, {
              toValue: 1,
              duration: duration / 2,
              delay: delay,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(animation, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            })
          ])
        ).start();
      }, [animation, duration, delay]);
  
      return (
        <Animated.Text
          key={`sparkle-${i}`}
          style={{
            position: "absolute",
            top: top,
            left: left,
            opacity: Animated.multiply(animation, 0.15), // Base opacity max 0.15 
            fontSize: Math.random() * 10 + 10,
            color: "#FFF",
          }}
        >
          ✨
        </Animated.Text>
      );
    });
  
    return (
      <View style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }} pointerEvents="none">
        {sparkles}
      </View>
    );
};

const FloatingNimo = ({ isIntroVisible }: { isIntroVisible?: boolean }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
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
        width: 80, // Size: 80
        height: 80,
        transform: [{ translateY }],
        zIndex: 10,
        opacity: isIntroVisible ? 0 : 1,
      }}
      pointerEvents={isIntroVisible ? "none" : "auto"}
    >
      <Animated.Image
        source={require("../../../../assets/images/nimo_blue_happy.png")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const AnimatedGameCard = ({ children, onPress, borderColor }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.95, // scale down to 0.95
      duration: 150, // duration 150ms
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1, // bounce back to 1
      friction: 4,
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
      <Animated.View 
        style={{ 
          transform: [{ scale }],
          backgroundColor: "white",
          borderRadius: 22, // borderRadius: 22
          padding: 18, // padding: 18
          marginBottom: 18, // marginBottom: 18
          borderLeftWidth: 6,
          borderLeftColor: borderColor,
          shadowColor: "black",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15, // shadowOpacity: 0.15
          shadowRadius: 8, // shadowRadius: 8
          elevation: 5,
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function GamesHome() {
  const router = useRouter();
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

  useFocusEffect(
    useCallback(() => {
      setIsMuted(getMuteState());
      setLangMode(getLanguageMode());
      void playMenuMusic();
      return () => {};
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const onBackPress = () => {
        router.replace("/modules/bilingual_translation" as any);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [router])
  );

  const gameOptions = [
    {
      title: "Picture Quiz",
      description: "Identify objects and learn their Tamil names",
      icon: "📸",
      color: "#1E88E5", // blue accent
      pathname: "/modules/bilingual_translation/games/picturequiz",
      params: {},
      level: { label: "Easy", bg: "#1E88E5", text: "#fff" },
    },
    {
      title: "Matching Game",
      description: "Match Tamil words with their translations",
      icon: "🔗",
      color: "#FBC02D", // yellow accent
      pathname: "/modules/bilingual_translation/games/matching",
      params: {},
      level: { label: "Balanced", bg: "#F9A825", text: "#fff" },
    },
    {
      title: "Word Hunt",
      description: "Find the correct translation for Tamil words",
      icon: "🎯",
      color: "#E53935", // red accent
      pathname: "/modules/bilingual_translation/games/wordhunt",
      params: {},
      level: { label: "Hard", bg: "#E53935", text: "#fff" },
    },
    {
      title: "Scan & Learn",
      description: "Use OCR to detect Tamil text from images",
      icon: "📱",
      color: "#8E24AA", // purple accent
      pathname: "/modules/bilingual_translation/games/scanlearn",
      params: {},
      level: { label: "Super Hard", bg: "#7B1FA2", text: "#fff" },
    },
    {
      title: "Daily Challenge",
      description: "Complete 5 questions daily and build your streak!",
      icon: "🔥",
      color: "#FB8C00", // orange accent
      pathname: "/modules/bilingual_translation/games/dailychallenge",
      params: {},
      level: null,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FloatingBubbles />
      <FloatingSparkles />
      <ScrollView
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <LinearGradient
          colors={["#63B3ED", "#4FD1C5"]}
          style={{
            paddingVertical: 30, // Replaced static height with padding
            justifyContent: "center",
            alignItems: "center",
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            marginBottom: 24,
            paddingHorizontal: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: "900",
              color: "white",
              marginBottom: 8,
              textAlign: "center",
              textShadowColor: "rgba(0, 0, 0, 0.15)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}
          >
            Choose a Game!
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "white",
              textAlign: "center",
              opacity: 0.95,
              fontWeight: "bold",
              marginBottom: 20, // Add bottom margin to separate from the badges
            }}
          >
            Play and learn new Tamil words
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
          {/* Game Options */}
          {gameOptions.map((game, index) => (
            <AnimatedGameCard
              key={index}
              borderColor={game.color}
              onPress={() => {
                playButtonClick();
                router.push({ pathname: game.pathname as any, params: game.params });
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${game.color}15`, // Adding alpha 15 to hex color for soft background
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{game.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "bold",
                        color: COLORS.navy,
                      }}
                    >
                      {game.title}
                    </Text>
                    {game.level && (
                      <View
                        style={{
                          backgroundColor: game.level.bg,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: game.level.text, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>
                          {game.level.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.text,
                      lineHeight: 20,
                    }}
                  >
                    {game.description}
                  </Text>
                </View>
              </View>
            </AnimatedGameCard>
          ))}

          {/* Improved Back Button */}
          <Pressable
            onPress={() => {
              router.replace("/modules/bilingual_translation" as any);
            }}
            style={({ pressed }) => ({
              backgroundColor: "#4FD1C5",
              opacity: pressed ? 0.8 : 1,
              paddingVertical: 14,
              borderRadius: 25,
              alignItems: "center",
              marginTop: 12,
              shadowColor: "#4FD1C5",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            })}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Back to Home
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <FloatingNimo />
    </View>
  );
}

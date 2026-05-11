import React, { useEffect, useRef, useCallback } from "react";
import {
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { playNimoAppear, playNimoDisappear } from "../services/soundService";

// Character images
const NIMO_IMAGES: Record<NimoEmotion, ImageSourcePropType> = {
  happy: require("../../../../assets/images/nimo_blue_happy.png"),
  sad: require("../../../../assets/images/nimo_blue_sad.png"),
};

export type NimoEmotion = "happy" | "sad";

interface NimoAssistantProps {
  emotion: NimoEmotion;
  subtitle: string;
  visible: boolean;
  muteSound?: boolean;
}

const NimoAssistant: React.FC<NimoAssistantProps> = ({
  emotion,
  subtitle,
  visible,
  muteSound = false,
}) => {
  // --- Appearance animation ---
  const opacity = useSharedValue(0);
  const appearTranslateX = useSharedValue(120);

  const isFirstRender = useRef(true);
  const prevVisible = useRef(visible);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 400 });
    appearTranslateX.value = withTiming(visible ? 0 : 120, { duration: 400 });
    
    // Play sound effects only when Nimo transitions visibility (not on mount)
    if (!isFirstRender.current && prevVisible.current !== visible) {
      if (!muteSound) {
        if (visible) {
          playNimoAppear();
        } else {
          playNimoDisappear();
        }
      }
    } else {
      isFirstRender.current = false;
    }
    
    prevVisible.current = visible;
  }, [visible, muteSound]);

  // --- Idle bounce animation ---
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // loop forever
        false
      );
    } else {
      translateY.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  // --- Blink animation (random interval 4–6s) ---
  const scaleY = useSharedValue(1);
  const blinkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBlink = useCallback(() => {
    scaleY.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    const nextDelay = 4000 + Math.random() * 2000; // 4–6 seconds
    blinkTimeout.current = setTimeout(triggerBlink, nextDelay);
  }, []);

  useEffect(() => {
    if (visible) {
      const initialDelay = 4000 + Math.random() * 2000;
      blinkTimeout.current = setTimeout(triggerBlink, initialDelay);
    } else {
      if (blinkTimeout.current) clearTimeout(blinkTimeout.current);
      scaleY.value = 1;
    }
    return () => {
      if (blinkTimeout.current) clearTimeout(blinkTimeout.current);
    };
  }, [visible, triggerBlink]);

  // --- Emotion reaction animations ---
  const reactionScale = useSharedValue(1);
  const reactionTranslateX = useSharedValue(0);
  const prevEmotion = useRef(emotion);

  useEffect(() => {
    if (prevEmotion.current === emotion) return; // skip initial mount
    prevEmotion.current = emotion;

    if (emotion === "happy") {
      // Quick bounce
      reactionScale.value = withSequence(
        withTiming(1.15, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
    } else if (emotion === "sad") {
      // Horizontal shake
      reactionTranslateX.value = withSequence(
        withTiming(-6, { duration: 100 }),
        withTiming(6, { duration: 100 }),
        withTiming(-6, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [emotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: appearTranslateX.value },
      { translateY: translateY.value },
    ],
  }));

  const characterStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: scaleY.value },
      { scale: reactionScale.value },
      { translateX: reactionTranslateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Animated.View style={characterStyle}>
        <Image source={NIMO_IMAGES[emotion]} style={styles.image} resizeMode="contain" />
      </Animated.View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    right: 16,
    alignItems: "center",
    zIndex: 999,
  },
  image: {
    width: 80,
    height: 80,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    textAlign: "center",
    maxWidth: 180,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default NimoAssistant;

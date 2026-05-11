import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// Soft pastel colors: blue, pink, yellow, green
const PASTEL_COLORS = ['#AEC6CF', '#FFB7B2', '#FDFD96', '#77DD77'];
const BUBBLE_COUNT = 10;

const Bubble = () => {
  // Randomize size, position, color, and animation duration/delay
  const size = useRef(Math.random() * 60 + 20).current; // Random size between 20 and 80
  const left = useRef(Math.random() * width).current;
  const color = useRef(PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]).current;
  const translateY = useRef(new Animated.Value(height + size)).current;
  const duration = useRef(Math.random() * 8000 + 6000).current; // 6 to 14 seconds
  const delay = useRef(Math.random() * 4000).current; // 0 to 4 seconds delay

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.timing(translateY, {
          toValue: -size - 100, // Move past the top of the screen
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    // Stagger the start of each bubble
    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, [translateY, size, duration, delay]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: left,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

export const AnimatedBackground = () => {
  const bubbles = Array.from({ length: BUBBLE_COUNT });

  return (
    <View style={styles.container} pointerEvents="none">
      {bubbles.map((_, index) => (
        <Bubble key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bubble: {
    position: 'absolute',
    opacity: 0.2, // Fixed opacity as requested
  },
});

export default AnimatedBackground;

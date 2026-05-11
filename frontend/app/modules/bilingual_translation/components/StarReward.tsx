import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Animated, StyleSheet, View, Dimensions, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Number of stars in the reward animation
const STAR_COUNT = 5;

// Maximum distance a star can travel from the center
const SPREAD_RADIUS = 120;

export interface StarRewardRef {
  showStarReward: () => void;
}

export const StarRewardComponent = forwardRef<StarRewardRef>((props, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const animations = useRef(
    Array.from({ length: STAR_COUNT }).map(() => ({
      scale: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;

  // Generate random angles and distances for each star's trajectory
  const trajectories = useRef(
    Array.from({ length: STAR_COUNT }).map(() => {
      const angle = Math.random() * Math.PI * 2; // Full circle
      const distance = Math.random() * (SPREAD_RADIUS - 50) + 50; // Between 50 and SPREAD_RADIUS
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        endRotation: Math.random() * 360 - 180, // Random rotation between -180 and 180 deg
      };
    })
  ).current;

  useImperativeHandle(ref, () => ({
    // The imperative function to trigger the animation from parent components
    showStarReward: () => {
      setIsVisible(true);

      // Reset values
      animations.forEach((anim) => {
        anim.scale.setValue(0.5);
        anim.translateX.setValue(0);
        anim.translateY.setValue(0);
        anim.opacity.setValue(1);
        anim.rotation.setValue(0);
      });

      // Animate all stars simultaneously
      const anims = animations.map((anim, index) => {
        const target = trajectories[index];
        return Animated.parallel([
          // Move outward
          Animated.timing(anim.translateX, {
            toValue: target.x,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: target.y,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Scale up slightly and then stay
          Animated.timing(anim.scale, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
          // Rotate while flying
          Animated.timing(anim.rotation, {
            toValue: 1, // Will map to target.endRotation
            duration: 800,
            useNativeDriver: true,
          }),
          // Fade out towards the end
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 500,
            delay: 1000, // Starts fading after 1 second, finishes at 1.5s
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(anims).start(() => {
        // Hide container when animation finishes (1500ms total)
        setIsVisible(false);
      });
    },
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {animations.map((anim, index) => {
        const targetRotation = trajectories[index].endRotation;
        const spin = anim.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${targetRotation}deg`],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.starContainer,
              {
                opacity: anim.opacity,
                transform: [
                  { translateX: anim.translateX },
                  { translateY: anim.translateY },
                  { scale: anim.scale },
                  { rotate: spin },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons name="star" size={40} color="#FFD700" />
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Ensure stars display over game content
    elevation: 999,
  },
  starContainer: {
    position: 'absolute',
    // Shadow to make stars pop
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});

// Create a singleton ref to allow calling from anywhere
export const starRewardRef = React.createRef<StarRewardRef>();

export const showStarReward = () => {
  starRewardRef.current?.showStarReward();
};

export const StarRewardProvider = () => {
  return <StarRewardComponent ref={starRewardRef} />;
};


export default function DummyRoute() { return null; }

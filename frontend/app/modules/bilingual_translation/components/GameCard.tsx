import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../../../../constants/colors';

interface GameCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  description,
  icon,
  onPress,
  color = COLORS.teal,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          { borderLeftColor: color },
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.navy,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
  },
});

export default GameCard;

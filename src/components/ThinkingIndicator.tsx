import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

interface ThinkingIndicatorProps {
  text?: string;
  textStyle?: any;
  themeColor?: string;
}

const SHAPE_SIZE = 24;

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  text,
  textStyle,
  themeColor
}) => {
  const { colors } = useTheme();
  const color = themeColor || colors.primary;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const leftStyle = useAnimatedStyle(() => {
    const shiftX = progress.value * -6;
    const shiftY = progress.value * 2;
    const rotate = progress.value * -15;
    return {
      transform: [
        { translateX: shiftX },
        { translateY: shiftY },
        { rotate: `${rotate}deg` }
      ]
    };
  });

  const rightStyle = useAnimatedStyle(() => {
    const shiftX = progress.value * 6;
    const shiftY = progress.value * 2;
    const rotate = progress.value * 15;
    return {
      transform: [
        { translateX: shiftX },
        { translateY: shiftY },
        { rotate: `${rotate}deg` }
      ]
    };
  });

  const crossStyle = useAnimatedStyle(() => {
    const shiftY = progress.value * 6;
    const scaleX = 1 - (progress.value * 0.5);
    return {
      transform: [
        { translateY: shiftY },
        { scaleX }
      ]
    };
  });

  const lineThickness = 2.5;
  const lineLength = 18;

  return (
    <View style={styles.thinkingContainer}>
      <View style={[styles.logoContainer, { width: SHAPE_SIZE, height: SHAPE_SIZE }]}>
        <Animated.View style={[styles.lineWrapper, { left: 6, bottom: 2, height: lineLength, justifyContent: 'flex-end' }, leftStyle]}>
          <View style={[styles.line, { 
            width: lineThickness, height: lineLength, 
            backgroundColor: color,
            transform: [{ rotate: '25deg' }, { translateY: 0 }] 
          }]} />
        </Animated.View>

        <Animated.View style={[styles.lineWrapper, { right: 6, bottom: 2, height: lineLength, justifyContent: 'flex-end' }, rightStyle]}>
          <View style={[styles.line, { 
            width: lineThickness, height: lineLength, 
            backgroundColor: color,
            transform: [{ rotate: '-25deg' }, { translateY: 0 }] 
          }]} />
        </Animated.View>

        <Animated.View style={[styles.lineWrapper, { top: 12, left: '50%', marginLeft: -4 }, crossStyle]}>
          <View style={[styles.line, { 
            width: 8, height: lineThickness, 
            backgroundColor: color 
          }]} />
        </Animated.View>
      </View>
      {text && <Text style={[styles.thinkingText, { color: colors.textSecondary }, textStyle]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  logoContainer: {
    marginRight: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineWrapper: {
    position: 'absolute',
  },
  line: {
    borderRadius: 2,
  },
  thinkingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

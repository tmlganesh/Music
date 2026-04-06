import React, { useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../theme';

interface SeekBarProps {
  position: number; // ms
  duration: number; // ms
  onSeek: (positionMs: number) => void;
  onSeeking?: (isSeeking: boolean) => void;
}

const SeekBar: React.FC<SeekBarProps> = ({
  position,
  duration,
  onSeek,
  onSeeking,
}) => {
  const [width, setWidth] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const progress = duration > 0 ? (isSeeking ? seekPosition : position) / duration : 0;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsSeeking(true);
      onSeeking?.(true);
      const x = evt.nativeEvent.locationX;
      const pos = (x / width) * duration;
      setSeekPosition(Math.max(0, Math.min(pos, duration)));
    },
    onPanResponderMove: (evt) => {
      const x = evt.nativeEvent.locationX;
      const pos = (x / width) * duration;
      setSeekPosition(Math.max(0, Math.min(pos, duration)));
    },
    onPanResponderRelease: () => {
      setIsSeeking(false);
      onSeeking?.(false);
      onSeek(seekPosition);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {/* Track background */}
      <View style={styles.track}>
        {/* Filled track with gradient */}
        <LinearGradient
          colors={[colors.accentSecondary, colors.accentPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.filledTrack, { width: `${clampedProgress * 100}%` }]}
        />
      </View>

      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          {
            left: clampedProgress * width - 7,
          },
        ]}
      >
        <View style={styles.thumbInner} />
        {isSeeking && <View style={styles.thumbGlow} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  track: {
    height: 4,
    backgroundColor: colors.seekTrackBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  filledTrack: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web only
    boxShadow: `0 2px 4px ${colors.glowColor}`,
    elevation: 3,
  },
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
  },
  thumbGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentGlow,
  },
});

export default React.memo(SeekBar);

import * as React from 'react';
import { Image, View } from 'react-native';

export default function PJDiamondIcon({ size = 80, style }: { size?: number; style?: any }) {
  // Keep the aspect ratio similar to the original icon (570/493)
  const aspectRatio = 570 / 493;
  return (
    <View style={[{ aspectRatio, width: size, overflow: 'hidden', borderRadius: size * 0.1 }, style]}>
      <Image
        source={require('./svg_shop_icon.jpg')}
        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
        accessibilityLabel="Shop Icon"
      />
    </View>
  );
}

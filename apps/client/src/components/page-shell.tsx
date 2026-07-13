import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomNav } from './bottom-nav';

export function PageShell({ children }: PropsWithChildren) {
  return (
    <View style={styles.container}>
      {children}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

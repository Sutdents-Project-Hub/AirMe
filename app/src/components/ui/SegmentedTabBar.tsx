import React, { useEffect, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText } from './app-text'; // 請確認你的 AppText 路徑

export interface TabItem {
  key: string;
  label: string;
  route: string;
}

export const DEFAULT_TABS: TabItem[] = [
  { key: 'today', label: '今日', route: '/' },
  { key: 'route', label: '路線規劃', route: '/routes' },
  { key: 'log', label: 'Air 日誌', route: '/history' },
  { key: 'profile', label: '我的 AirMe', route: '/settings' },
];

interface SegmentedTabBarProps {
  activeKey: string;
  tabs?: TabItem[];
  onChange?: (key: string) => void;
}

interface TabLayout {
  x: number;
  width: number;
}

export function SegmentedTabBar({
  activeKey,
  tabs = DEFAULT_TABS,
  onChange,
}: SegmentedTabBarProps) {
  const router = useRouter();
  const [layouts, setLayouts] = useState<Record<number, TabLayout>>({});

  const animX = useRef(new Animated.Value(0)).current;
  const animWidth = useRef(new Animated.Value(0)).current;

  const activeIndex = tabs.findIndex((tab) => tab.key === activeKey);

  useEffect(() => {
    const currentLayout = layouts[activeIndex];
    if (currentLayout) {
      Animated.parallel([
        Animated.spring(animX, {
          toValue: currentLayout.x,
          friction: 8,
          tension: 140,
          useNativeDriver: false,
        }),
        Animated.spring(animWidth, {
          toValue: currentLayout.width,
          friction: 8,
          tension: 140,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [activeIndex, layouts, animX, animWidth]);

  const handleLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({
      ...prev,
      [index]: { x, width },
    }));
  };

  const handlePress = (tab: TabItem) => {
    // 觸發外部 State 更新
    if (onChange) {
      onChange(tab.key);
    }
    // 觸發 Expo Router 跳轉
    if (tab.route) {
      router.push(tab.route as Href);
    }
  };

  return (
    <View style={styles.container}>
      {/* 關鍵修復：pointerEvents="none" 確保綠塊不擋住點擊事件 */}
      {Object.keys(layouts).length > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              left: animX,
              width: animWidth,
            },
          ]}
        />
      )}

      {/* 各個 Tab 點擊區塊 */}
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeKey;

        return (
          <Pressable
            key={tab.key}
            onPress={() => handlePress(tab)}
            onLayout={(e) => handleLayout(index, e)}
            style={styles.tabButton}>
            <AppText
              variant="body-medium"
              weight="800"
              style={[
                styles.tabText,
                isActive ? styles.tabTextActive : styles.tabTextInactive,
              ]}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 235, 208, 0.7)',
    borderRadius: 24,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#A7F3D0',
    borderRadius: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 0, // 置於底層
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // 確保高於 indicator
  },
  tabText: {
    fontSize: 15,
  },
  tabTextActive: {
    color: '#064E3B',
  },
  tabTextInactive: {
    color: '#047857',
    opacity: 0.8,
  },
});
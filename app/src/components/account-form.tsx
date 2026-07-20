import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { radii, spacing, typography, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

type Mode = 'login' | 'register';

export function AccountForm() {
  const app = useApp();
  const palette = usePalette();
  const [mode, setMode] = useState<Mode>('register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consented, setConsented] = useState(false);

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= (mode === 'register' ? 12 : 1) &&
    (mode === 'login' || (displayName.trim().length > 0 && consented));

  const submit = async () => {
    if (!canSubmit) return;
    const succeeded =
      mode === 'register'
        ? await app.registerAccount({
            email: email.trim().toLowerCase(),
            password,
            displayName: displayName.trim(),
            privacyConsent: true,
          })
        : await app.loginAccount({ email: email.trim().toLowerCase(), password });
    if (succeeded) setPassword('');
  };

  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        <Tab active={mode === 'register'} label="建立帳號" onPress={() => setMode('register')} />
        <Tab active={mode === 'login'} label="登入" onPress={() => setMode('login')} />
      </View>

      <Card>
        <View style={styles.form}>
          {mode === 'register' ? (
            <TextField
              label="顯示名稱"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="可使用暱稱，不需要真名"
              maxLength={40}
            />
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="密碼"
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? '至少 12 個字元' : '輸入你的密碼'}
            secureTextEntry
            autoCapitalize="none"
          />
          {mode === 'register' ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="同意帳號資料使用說明"
              accessibilityState={{ checked: consented }}
              onPress={() => setConsented((value) => !value)}
              style={styles.consent}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: consented ? palette.primary : palette.border },
                  consented && { backgroundColor: palette.primary },
                ]}>
                {consented ? <AppText style={{ color: palette.onPrimary }}>✓</AppText> : null}
              </View>
              <AppText variant="body-small" style={styles.consentCopy}>
                我同意 AirMe 保存 Email、顯示名稱、密碼雜湊與登入工作階段，用於帳號存取與安全維護。個人檔案、活動與回饋不會因登入自動同步。
              </AppText>
            </Pressable>
          ) : null}
          {app.error ? (
            <Card accessibilityRole="alert" style={{ backgroundColor: palette.destructiveSoft }}>
              <AppText tone="danger">{app.error}</AppText>
            </Card>
          ) : null}
          <AppButton
            label={mode === 'register' ? '建立帳號' : '登入 AirMe'}
            onPress={() => void submit()}
            disabled={!canSubmit}
            loading={app.authBusy}
          />
        </View>
      </Card>
    </View>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, { backgroundColor: active ? palette.accentSoft : palette.surface }]}>
      <AppText weight="800" style={{ color: active ? palette.primary : palette.textMuted }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
}) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <AppText weight="700">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        textContentType={secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'emailAddress' : 'nickname'}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { borderRadius: radii.pill, minHeight: 44, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  consent: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  checkbox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  consentCopy: { flex: 1 },
});

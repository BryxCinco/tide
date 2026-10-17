import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AboutSection,
  AvatarPickerModal,
  ChangePasswordModal,
  DeleteAccountModal,
  EditProfileModal,
  FeedbackModal,
  LanguageModal,
  LevelCard,
  LogoutModal,
  OptionPickerModal,
  ProfileCover,
  SettingsItem,
  SettingsSection,
  SettingsSwitch,
  StatsRow,
} from '@/components/profile';
import { BentoTile, ErrorState, Icon, ResponsiveContainer, Text, ThemeToggle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LANGUAGES, useTranslation } from '@/i18n';
import { reportApiError } from '@/services/api';
import { useSettingsStore } from '@/store/settingsStore';
import { useStreakStore } from '@/store/streakStore';
import { useThemeStore } from '@/store/themeStore';
import { showToast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { clearCache } from '@/utils/clearCache';
import { confirmAsync } from '@/utils/confirm';
import { deleteAccount } from '@/utils/deleteAccount';
import { exportUserData } from '@/utils/exportData';
import type { WeekStart } from '@/types/settings';

const WEEK_START_LABELS: Record<WeekStart, string> = { monday: 'Monday', sunday: 'Sunday' };

/** Compact text-pill toggle — "12h"/"24h" doesn't have a natural icon pair, so this stays
 * text-based rather than icon-only like the segmented controls elsewhere in this app. */
function TimeFormatSegmented({ value, onChange }: { value: '12h' | '24h'; onChange: (v: '12h' | '24h') => void }) {
  return (
    <View className="flex-row gap-1 rounded-full border border-subtle bg-base p-1">
      {(['12h', '24h'] as const).map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            className={cn('rounded-full px-2.5 py-1', selected && 'bg-tide-teal')}
          >
            <Text variant="caption" color={selected ? 'inverse' : 'muted'} className="normal-case tracking-normal">
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { logout, isGuest } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const settingsError = useSettingsStore((s) => s.error);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const clearSettingsError = useSettingsStore((s) => s.clearError);
  const fetchStreak = useStreakStore((s) => s.fetchStreak);
  const appliedTheme = useThemeStore((s) => s.theme);
  const isMatchingSystem = settings.theme === 'system';

  useEffect(() => {
    fetchSettings();
    fetchStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSettings(), fetchStreak()]);
    setRefreshing(false);
  };

  const [editVisible, setEditVisible] = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [weekStartPickerVisible, setWeekStartPickerVisible] = useState(false);

  const currentLanguageName = LANGUAGES.find((l) => l.code === settings.language)?.nativeName ?? 'English';

  const handleLogout = async () => {
    await logout();
    setLogoutVisible(false);
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount(isGuest);
      setDeleteVisible(false);
      router.replace('/(auth)/login');
      // Toast is always mounted at the app root (see app/_layout.tsx), not gated by auth, so
      // this still lands on the login screen even though the profile screen it fired from
      // has just unmounted.
      showToast('Account deleted');
    } catch (err) {
      // Deliberately NOT closing the modal or navigating away here — the backend delete
      // failed, so the account and its data are still intact server-side. Closing the
      // modal or logging out here would make it look like the deletion went through when
      // it didn't.
      reportApiError(err, 'Could not delete your account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleClearCache = async () => {
    const confirmed = await confirmAsync(
      'Clear cache?',
      'Clears your recent search history and AI Coach conversation. Your activities, tasks, and journal entries are not affected.',
      'Clear',
    );
    if (confirmed) clearCache();
  };

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ResponsiveContainer className="gap-3 pt-14 md:gap-4 md:pt-6">
          {settingsError && (
            <ErrorState
              message={`Settings didn't sync: ${settingsError}`}
              onRetry={() => {
                clearSettingsError();
                fetchSettings();
              }}
              className="py-4"
            />
          )}

          {/* Identity (2/3) + level (1/3) on wide screens, stacked on phone. */}
          <View className="gap-3 md:flex-row md:gap-4">
            <ProfileCover
              className="md:flex-[1.6]"
              onAvatarPress={() => setAvatarPickerVisible(true)}
              onEditPress={() => setEditVisible(true)}
            />
            <LevelCard className="md:flex-1" />
          </View>

          <StatsRow />

          {/* Preferences — the longest group — gets the wide left column; the shorter
              Account / Data / About groups stack in the right column. */}
          <View className="gap-3 lg:flex-row lg:items-start lg:gap-4">
            <SettingsSection title={t('profile.preferences')} icon="SlidersHorizontal" color="#6366F1" index={6} className="lg:flex-[1.3]">
              {/* Same ThemeToggle (and circular-reveal animation) as the sidebar. "Match
                  System" is its own row since a binary pill can't represent 3 states. */}
              <SettingsItem icon="Palette" label={t('profile.appearance')} description={appliedTheme === 'dark' ? 'Dark' : 'Light'} right={<ThemeToggle />} />
              <SettingsItem
                icon="Monitor"
                label={t('profile.matchSystem')}
                description="Follow your device's setting"
                right={<SettingsSwitch value={isMatchingSystem} onValueChange={(v) => updateSetting('theme', v ? 'system' : appliedTheme)} />}
              />
              <SettingsItem
                icon="Bell"
                label={t('profile.notifications')}
                right={<SettingsSwitch value={settings.notifications} onValueChange={(v) => updateSetting('notifications', v)} />}
              />
              <SettingsItem
                icon="Volume2"
                label={t('profile.soundEffects')}
                right={<SettingsSwitch value={settings.soundEffects} onValueChange={(v) => updateSetting('soundEffects', v)} />}
              />
              <SettingsItem
                icon="Keyboard"
                label={t('profile.typingSounds')}
                disabled={!settings.soundEffects}
                right={
                  <SettingsSwitch
                    value={settings.typingSounds}
                    onValueChange={(v) => updateSetting('typingSounds', v)}
                    disabled={!settings.soundEffects}
                  />
                }
              />
              <SettingsItem
                icon="Globe"
                label={t('profile.language')}
                onPress={() => setLanguagePickerVisible(true)}
                right={
                  <View className="flex-shrink flex-row items-center gap-2">
                    <Text variant="body" color="muted" className="shrink normal-case tracking-normal" numberOfLines={1}>
                      {currentLanguageName}
                    </Text>
                    <Icon name="ChevronRight" size={18} color={themeColors.text.disabled} />
                  </View>
                }
              />
              <SettingsItem
                icon="Calendar"
                label={t('profile.weekStartsOn')}
                onPress={() => setWeekStartPickerVisible(true)}
                right={
                  <View className="flex-shrink flex-row items-center gap-2">
                    <Text variant="body" color="muted" className="shrink normal-case tracking-normal" numberOfLines={1}>
                      {WEEK_START_LABELS[settings.weekStartsOn]}
                    </Text>
                    <Icon name="ChevronRight" size={18} color={themeColors.text.disabled} />
                  </View>
                }
              />
              <SettingsItem
                icon="Clock"
                label={t('profile.timeFormat')}
                right={<TimeFormatSegmented value={settings.timeFormat} onChange={(v) => updateSetting('timeFormat', v)} />}
              />
            </SettingsSection>

            <View className="gap-3 lg:flex-1 lg:gap-4">
              <SettingsSection title={t('profile.account')} icon="User" color="#14B8A6" index={7}>
                <SettingsItem icon="User" label={t('profile.editProfile')} onPress={() => setEditVisible(true)} />
                <SettingsItem icon="Lock" label={t('profile.changePassword')} onPress={() => setChangePasswordVisible(true)} />
              </SettingsSection>

              <SettingsSection title={t('profile.data')} icon="Database" color="#0EA5E9" index={8}>
                <SettingsItem icon="Download" label={t('profile.exportData')} description="Download a copy as JSON" onPress={exportUserData} />
                <SettingsItem icon="Trash" label={t('profile.clearCache')} description="Recent searches & AI conversation" onPress={handleClearCache} />
                <SettingsItem icon="UserX" label={t('profile.deleteAccount')} danger onPress={() => setDeleteVisible(true)} />
              </SettingsSection>

              <AboutSection index={9} onFeedbackPress={() => setFeedbackVisible(true)} />

              <BentoTile index={10} onPress={() => setLogoutVisible(true)} accessibilityLabel={t('profile.logOut')}>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-error/10">
                    <Icon name="LogOut" size={17} color={themeColors.status.error} />
                  </View>
                  <Text variant="body" className="flex-1 font-semibold text-error">
                    {t('profile.logOut')}
                  </Text>
                  <Icon name="ChevronRight" size={18} color={themeColors.status.error} />
                </View>
              </BentoTile>
            </View>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onChangeAvatar={() => {
          setEditVisible(false);
          setAvatarPickerVisible(true);
        }}
      />
      <AvatarPickerModal visible={avatarPickerVisible} onClose={() => setAvatarPickerVisible(false)} />
      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} />
      <LogoutModal visible={logoutVisible} onClose={() => setLogoutVisible(false)} onConfirm={handleLogout} />
      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeletingAccount}
      />
      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />

      <LanguageModal visible={languagePickerVisible} onClose={() => setLanguagePickerVisible(false)} />
      <OptionPickerModal
        visible={weekStartPickerVisible}
        onClose={() => setWeekStartPickerVisible(false)}
        title={t('profile.weekStartsOn')}
        icon="Calendar"
        value={settings.weekStartsOn}
        options={(Object.keys(WEEK_START_LABELS) as WeekStart[]).map((value) => ({ value, label: WEEK_START_LABELS[value] }))}
        onSelect={(value) => updateSetting('weekStartsOn', value)}
      />
    </SafeAreaView>
  );
}

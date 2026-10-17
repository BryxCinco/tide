import Constants from 'expo-constants';
import { router } from 'expo-router';

import { showToast } from '../../store/toastStore';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

export interface AboutSectionProps {
  onFeedbackPress: () => void;
  index?: number;
  className?: string;
}

/** App Version reads from app.json via expo-constants rather than a hardcoded string, so
 * it can't drift out of sync with the real build. Privacy/Terms now push the real
 * app/legal/* screens. Rate the App has no real store listing to link to yet — rather than
 * fabricate a store URL for `Linking.openURL`, it acknowledges the tap with a toast on
 * every platform; a real release would swap that for a real store link on mobile. */
export function AboutSection({ onFeedbackPress, index, className }: AboutSectionProps) {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SettingsSection title="About" icon="Info" color="#64748B" index={index} className={className}>
      <SettingsItem icon="Info" label="App Version" description={version} disabled />
      <SettingsItem icon="Shield" label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
      <SettingsItem icon="FileText" label="Terms of Service" onPress={() => router.push('/legal/terms')} />
      <SettingsItem icon="Star" label="Rate the App" onPress={() => showToast('Thanks for your feedback!')} />
      <SettingsItem icon="MessageSquare" label="Send Feedback" onPress={onFeedbackPress} />
    </SettingsSection>
  );
}

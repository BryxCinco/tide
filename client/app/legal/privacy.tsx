import { AppLayout } from '@/components/layout';
import { LegalDocument, type LegalSection } from '@/components/legal';

const SECTIONS: LegalSection[] = [
  {
    icon: 'BookOpen',
    heading: 'Introduction',
    paragraphs: [
      'Tide ("we", "our", "the app") helps you track focus time, activities, tasks, and journal entries. This Privacy Policy explains what information the app works with and how it is used.',
      'By using Tide, you agree to the practices described here. If you do not agree, please do not use the app.',
    ],
  },
  {
    icon: 'Database',
    heading: 'Information We Collect',
    paragraphs: [
      'Account information: your name, email address, and an optional profile photo and bio, provided when you register or edit your profile.',
      'Content you create: timer sessions, activities, tasks, and journal entries you add while using the app.',
      'Preferences: theme, language, notification, and other settings you choose in Profile & Settings.',
      'Demo sessions do not require an email address — a temporary local profile is used instead.',
    ],
  },
  {
    icon: 'Settings2',
    heading: 'How We Use Your Information',
    paragraphs: [
      'To operate core features: showing your dashboard, timer history, tasks, journal, and insights.',
      'To remember your preferences, such as theme and language, across sessions.',
      'To improve the app\'s reliability and usability over time.',
      'We do not sell your information, and we do not use your journal or task content for advertising.',
    ],
  },
  {
    icon: 'ShieldCheck',
    heading: 'Data Storage and Security',
    paragraphs: [
      'In this version of Tide, your data is stored locally on your device (and, where applicable, secure on-device storage), rather than on a remote server.',
      'Exporting your data (Profile → Data → Export Data) creates a JSON file on your device that you control. Treat exported files as sensitive, since they contain your personal content.',
      'No method of storage is 100% secure, and we cannot guarantee absolute security for data kept on a device outside our control (for example, a lost or shared device).',
    ],
  },
  {
    icon: 'Puzzle',
    heading: 'Third-Party Services',
    paragraphs: [
      'The AI Coach feature in this demo uses a simulated response generator and does not send your messages to a third-party AI provider.',
      'A future version of Tide may integrate third-party services (such as a real AI provider or cloud sync). If that happens, this policy will be updated before those services are enabled.',
    ],
  },
  {
    icon: 'UserCog',
    heading: 'Your Rights',
    paragraphs: [
      'You can view, edit, or delete your profile information at any time from Profile → Edit Profile.',
      'You can export a copy of your data at any time from Profile → Data → Export Data.',
      'You can delete your account and all associated local data from Profile → Data → Delete Account. This action cannot be undone.',
    ],
  },
  {
    icon: 'Baby',
    heading: "Children's Privacy",
    paragraphs: [
      'Tide is not directed at children under 13, and we do not knowingly collect information from children under 13. If you believe a child has provided information through the app, please contact us so it can be removed.',
    ],
  },
  {
    icon: 'History',
    heading: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last updated" date at the top of this page.',
    ],
  },
  {
    icon: 'Mail',
    heading: 'Contact Us',
    paragraphs: [
      'This is a demo app built for illustrative purposes and does not have a live support channel yet. In a production release, this section would list a real contact email.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <AppLayout showMobileMenuButton={false}>
      <LegalDocument title="Privacy Policy" lastUpdated="September 22, 2026" sections={SECTIONS} />
    </AppLayout>
  );
}

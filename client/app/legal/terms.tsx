import { AppLayout } from '@/components/layout';
import { LegalDocument, type LegalSection } from '@/components/legal';

const SECTIONS: LegalSection[] = [
  {
    icon: 'CheckCircle2',
    heading: 'Acceptance of Terms',
    paragraphs: [
      'By creating an account, using a guest session, or otherwise accessing Tide, you agree to these Terms of Service. If you do not agree, please do not use the app.',
    ],
  },
  {
    icon: 'LayoutGrid',
    heading: 'Description of Service',
    paragraphs: [
      'Tide is a personal productivity app for tracking focus time, activities, tasks, and journal entries, along with basic insights and an AI Coach feature.',
      'Tide is provided "as is", as a demo application, and may change, be interrupted, or be discontinued at any time without notice.',
    ],
  },
  {
    icon: 'UserCircle2',
    heading: 'User Accounts',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your account and for all activity under it.',
      'Guest sessions store data locally on your device only and are not tied to an email address. Linking a guest session to a real account transfers that local data to the new account.',
    ],
  },
  {
    icon: 'FileText',
    heading: 'User Content',
    paragraphs: [
      'You retain ownership of the tasks, journal entries, and other content you create in Tide ("User Content").',
      'You are solely responsible for your User Content, including its accuracy and legality.',
    ],
  },
  {
    icon: 'ShieldAlert',
    heading: 'Acceptable Use',
    paragraphs: [
      'You agree not to use Tide to store or transmit unlawful content, attempt to disrupt the app\'s functionality, or attempt to gain unauthorized access to other users\' data.',
    ],
  },
  {
    icon: 'Copyright',
    heading: 'Intellectual Property',
    paragraphs: [
      'The Tide app, including its design, branding, and code, is the property of its developers, except for User Content you create.',
      'Nothing in these Terms grants you rights to Tide\'s branding, source code, or design beyond what is needed to use the app as intended.',
    ],
  },
  {
    icon: 'XCircle',
    heading: 'Termination',
    paragraphs: [
      'You may stop using Tide and delete your account at any time from Profile → Data → Delete Account.',
      'We may suspend or terminate access to the app for conduct that violates these Terms or is otherwise harmful to the app or other users.',
    ],
  },
  {
    icon: 'TriangleAlert',
    heading: 'Disclaimer',
    paragraphs: [
      'Tide is a demo application provided without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.',
      'Tide is not a medical, therapeutic, or professional productivity-coaching service. Insights and AI Coach suggestions are for general informational purposes only.',
    ],
  },
  {
    icon: 'Scale',
    heading: 'Limitation of Liability',
    paragraphs: [
      'To the fullest extent permitted by law, the developers of Tide are not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the app, including loss of data stored locally on your device.',
    ],
  },
  {
    icon: 'Gavel',
    heading: 'Governing Law',
    paragraphs: [
      'These Terms are governed by the laws of the jurisdiction in which the app\'s developers operate, without regard to conflict-of-law principles. This section is illustrative only, as noted at the top of this page.',
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

export default function TermsOfServiceScreen() {
  return (
    <AppLayout showMobileMenuButton={false}>
      <LegalDocument title="Terms of Service" lastUpdated="September 22, 2026" sections={SECTIONS} />
    </AppLayout>
  );
}

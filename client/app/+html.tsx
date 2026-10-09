import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const SITE_URL = 'https://tide-rust.vercel.app';
const TITLE = 'Tide - Your Productivity Coach';
const DESCRIPTION =
  'Tide is a personal productivity app that helps you track your time, journal your thoughts, build better habits, and reflect on your progress—all in one place. Powered by AI.';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Root HTML document for every web page (see Expo Router's static-rendering docs) — this is
 * what a link-preview crawler (Facebook, Messenger, Twitter/X, Discord, ...) actually reads,
 * since those never execute JS. Without this file, Expo Router falls back to app.json's
 * `expo.name` ("client") for <title> and has no Open Graph/Twitter meta tags at all, which is why
 * shared links previously showed "client" or "Expo" instead of the app's real name.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Disables body scrolling on web so the root React Native `ScrollView`/gesture
            handling behaves the same as native instead of double-scrolling. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

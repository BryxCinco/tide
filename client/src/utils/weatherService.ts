import { Platform } from 'react-native';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface WeatherData {
  temperatureC: number;
  condition: WeatherCondition;
  locationLabel: string;
  /** True when this is the honest placeholder, not a real fetch — see fetchWeather's doc. */
  isMocked: boolean;
}

const MOCK_WEATHER: WeatherData = { temperatureC: 24, condition: 'clear', locationLabel: 'Manila', isMocked: true };

/** Collapses Open-Meteo's WMO weather codes (https://open-meteo.com/en/docs, `weather_code`
 * field) into the 4 buckets WeatherWidget.tsx has icons for. */
function conditionFromWmoCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  return 'rain';
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const temperature = json?.current?.temperature_2m;
    const code = json?.current?.weather_code;
    if (typeof temperature !== 'number' || typeof code !== 'number') return null;

    // Open-Meteo has no free reverse-geocoding endpoint (coordinates -> city name), so a
    // real fetch is labeled generically rather than guessing/fabricating a city.
    return { temperatureC: Math.round(temperature), condition: conditionFromWmoCode(code), locationLabel: 'Current Location', isMocked: false };
  } catch {
    return null;
  }
}

function getBrowserCoordinates(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

/**
 * Open-Meteo (open-meteo.com) needs no API key, so this calls it directly instead of
 * through a backend proxy. Real data requires the browser's Geolocation API — web only, on
 * purpose: a native geolocation module (e.g. expo-location) isn't installed, since adding a
 * new native dependency is outside what this task pre-approved installs for. On native, or
 * wherever geolocation is denied/unavailable/slow, or the fetch itself fails, this resolves
 * to MOCK_WEATHER — an honest placeholder rather than a broken widget, exactly the "mock
 * data initially" fallback the spec allows.
 */
export async function fetchWeather(): Promise<WeatherData> {
  if (Platform.OS !== 'web') return MOCK_WEATHER;

  const coords = await getBrowserCoordinates();
  if (!coords) return MOCK_WEATHER;

  const real = await fetchOpenMeteo(coords.lat, coords.lon);
  return real ?? MOCK_WEATHER;
}

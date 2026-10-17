import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { fetchWeather, type WeatherCondition, type WeatherData } from '../../../utils/weatherService';
import { Card, Icon, Loader, Text, type IconName } from '../../ui';

const CONDITION_ICON: Record<WeatherCondition, IconName> = {
  clear: 'Sun',
  cloudy: 'Cloud',
  rain: 'CloudRain',
  snow: 'Snowflake',
};

const CONDITION_LABEL: Record<WeatherCondition, string> = {
  clear: 'Clear',
  cloudy: 'Cloudy',
  rain: 'Rainy',
  snow: 'Snowy',
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWeather().then((data) => {
      if (!cancelled) setWeather(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card variant="default" padding="md" className="rounded-[24px] min-h-[150px] items-center justify-center gap-1.5">
      {!weather ? (
        <Loader size="sm" />
      ) : (
        <>
          <Icon name={CONDITION_ICON[weather.condition]} size={30} color="#14B8A6" />
          <Text variant="h1" color="primary" className="font-bold" style={{ fontSize: 26 }}>
            {weather.temperatureC}°C
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            {CONDITION_LABEL[weather.condition]}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Icon name="MapPin" size={11} color="#9CA3AF" />
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {weather.locationLabel}
            </Text>
          </View>
        </>
      )}
    </Card>
  );
}

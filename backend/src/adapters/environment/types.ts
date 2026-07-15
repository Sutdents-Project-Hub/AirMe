import type { EnvironmentSnapshot, Location } from '@airme/contracts';

export interface AirQualityReading {
  value: EnvironmentSnapshot['airQuality'];
  source: EnvironmentSnapshot['sources'][number];
}

export interface WeatherReading {
  value: EnvironmentSnapshot['weather'];
  source: EnvironmentSnapshot['sources'][number];
}

export type LoadAirQuality = (location: Location) => Promise<AirQualityReading>;
export type LoadWeather = (location: Location) => Promise<WeatherReading>;

/**
 * Shared Expo Push API client. With Expo "Enhanced Security for Push Notifications",
 * every send must include Authorization: Bearer <EXPO_ACCESS_TOKEN>. The expo-server-sdk
 * adds that header when `accessToken` is set here (see Expo constructor options).
 */
import { Expo } from 'expo-server-sdk';

let _expo: Expo | null = null;

/** expo-server-sdk exposes token validation as a static method only — do not call on an instance. */
export function isValidExpoPushToken(token: unknown): token is string {
  return Expo.isExpoPushToken(token);
}

export function getExpoPushClient(): Expo {
  if (!_expo) {
    _expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true,
    });
  }
  return _expo;
}

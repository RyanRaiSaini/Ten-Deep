/**
 * /run is a shared run link. On the web the server answers it (api/run.ts: preview image, then /c). If the app
 * itself opens one (a deep link, or local dev), go straight to the challenge screen with the same query.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function Run() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Redirect href={{ pathname: '/c', params }} />;
}

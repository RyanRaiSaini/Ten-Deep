import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { SFX, type SfxName } from '../audio/sfx';
import { Button, Card, Header, Screen } from '../ui/components';
import { C } from '../ui/theme';

const SOUNDS: { name: SfxName; what: string }[] = [
  { name: 'tick', what: 'Spinner tick (plays on every team that rolls past)' },
  { name: 'thunk', what: 'Spinner lands' },
  { name: 'pickChime', what: '"The pick is in" — when you draft a player' },
  { name: 'swish', what: 'Big shot in the game feed' },
  { name: 'buzzer', what: 'Final buzzer / elimination' },
  { name: 'crowd', what: 'Playoff crowd swell' },
  { name: 'fanfare', what: 'You won the title' },
];

export default function SoundDemo() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Header title={t('settings.soundDemo')} left={<Button label="‹" variant="ghost" onPress={() => router.back()} style={{ paddingVertical: 6 }} />} />
      <Text style={styles.note}>All sounds are synthesized in code — tap to preview.</Text>
      {SOUNDS.map((s) => (
        <Card key={s.name} style={{ gap: 10 }}>
          <Text style={styles.what}>{s.what}</Text>
          <Button label={`▶  ${s.name}`} variant="secondary" onPress={() => SFX[s.name]()} />
        </Card>
      ))}
      <Button
        label="▶  Play a whole draft pick"
        onPress={() => {
          let i = 0;
          const run = () => {
            SFX.tick();
            i++;
            if (i < 14) setTimeout(run, 50 + i * i * 2.5);
            else { SFX.thunk(); setTimeout(() => SFX.pickChime(), 700); }
          };
          run();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: C.muted, fontSize: 14 },
  what: { color: C.text, fontSize: 15 },
});

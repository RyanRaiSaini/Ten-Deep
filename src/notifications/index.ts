import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { dailyKey } from '../engine/daily';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { planNotifications } from './plan';

/** Reschedule local reminders on iOS/Android whenever the toggles, language or last-played day change. Web: no-op. */
export function useNotificationSync() {
  const { t, i18n } = useTranslation();
  const { notifDaily, notifStreak } = useSettings();
  const lastPlayed = useProfile((s) => s.lastPlayed);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!notifDaily && !notifStreak) return;
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted || cancelled) return;
      const plan = planNotifications({ now: new Date(), daily: notifDaily, streak: notifStreak, playedToday: lastPlayed === dailyKey() });
      for (const p of plan) {
        const content = p.kind === 'daily'
          ? { title: t('notif.dailyTitle'), body: t('notif.dailyBody') }
          : { title: t('notif.streakTitle'), body: t('notif.streakBody') };
        const trigger = p.trigger.type === 'daily'
          ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: p.trigger.hour, minute: p.trigger.minute } as const
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.trigger.at } as const;
        await Notifications.scheduleNotificationAsync({ content, trigger });
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [notifDaily, notifStreak, lastPlayed, i18n.language, t]);
}

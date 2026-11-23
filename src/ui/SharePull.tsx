/** "Share pull": a link that unfurls into a picture of the card (see api/pull.ts). */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../config';
import { ONE_IN, type Finish } from '../engine/collect/finishes';
import type { Card } from '../engine/collect/tiers';
import { Button } from './components';
import { Icon } from './icons';
import { shareText } from './share';

export const pullUrl = (card: Card, finish: Finish) => `${CONFIG.webUrl}/pull/${encodeURIComponent(card.id)}/${finish}`;

export function SharePull({ card, finish, testID = 'share-pull' }: { card: Card; finish: Finish; testID?: string }) {
  const { t } = useTranslation();
  const [done, setDone] = useState<'shared' | 'copied' | null>(null);
  const text = finish === 'base'
    ? t('finish.shareTextBase', { tier: t(`collect.tier_${card.tier}`), name: card.name })
    : t('finish.shareText', { finish: t(`finish.${finish}`), name: card.name, odds: t('finish.oneIn', { n: ONE_IN[finish].toLocaleString('en-US') }) });
  return (
    <Button
      label={done ? t(`challenge.${done}`) : t('finish.share')}
      variant="dark"
      icon={<Icon name="share" size={22} />}
      testID={testID}
      onPress={async () => {
        const r = await shareText(`${text}\n${pullUrl(card, finish)}`);
        if (r !== 'failed') setDone(r);
      }}
    />
  );
}

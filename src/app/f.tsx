import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { decodeFriend } from '../engine/friends/code';
import { useFriends } from '../store/friends';
import { Loading } from '../ui/Loading';

/** A shared friend link (/f?c=TD1...): add them and open their page. */
export default function FriendLink() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  useEffect(() => {
    const snap = c ? decodeFriend(String(c)) : null;
    if (!snap) return router.replace('/friends/add');
    const r = useFriends.getState().add(snap);
    if (r === 'self') return router.replace('/duel');
    router.replace({ pathname: '/friends/[pin]', params: { pin: snap.pin, fresh: r } });
  }, [c]);
  return <Loading />;
}

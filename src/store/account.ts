/** Which sign-in this device is connected with (the account itself lives on the server: api/account.ts). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Provider = 'apple' | 'google';

interface AccountStore {
  provider: Provider | null;
  linkedAt: string | null;
  set: (provider: Provider | null) => void;
}

export const useAccount = create<AccountStore>()(
  persist(
    (set) => ({
      provider: null,
      linkedAt: null,
      set: (provider) => set({ provider, linkedAt: provider ? new Date().toISOString() : null }),
    }),
    { name: 'tendeep-account', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

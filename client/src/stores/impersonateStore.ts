import { create } from 'zustand';

interface ImpersonateState {
  characterId: string | null;
  characterName: string | null;
  characterMeta: { level: number; race: string; className: string } | null;
  isImpersonating: boolean;
  startImpersonating: (id: string, name: string, meta?: { level: number; race: string; className: string }) => void;
  stopImpersonating: () => void;
}

export const useImpersonateStore = create<ImpersonateState>((set) => ({
  characterId: null,
  characterName: null,
  characterMeta: null,
  isImpersonating: false,
  startImpersonating: (id, name, meta) =>
    set({ characterId: id, characterName: name, characterMeta: meta ?? null, isImpersonating: true }),
  stopImpersonating: () =>
    set({ characterId: null, characterName: null, characterMeta: null, isImpersonating: false }),
}));

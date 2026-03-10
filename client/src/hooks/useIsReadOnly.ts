import { useImpersonateStore } from '../stores/impersonateStore';

export function useIsReadOnly(): boolean {
  return useImpersonateStore((s) => s.isImpersonating);
}

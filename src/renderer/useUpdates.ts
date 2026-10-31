import { useEffect, useState } from 'react';
import type { UpdateCommand, UpdateSnapshot } from '../shared/updates';

export function useUpdates(flush: () => Promise<void>) {
  const [snapshot, setSnapshot] = useState<UpdateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = window.prezi.subscribeUpdates(setSnapshot);
    void window.prezi.updateStatus().then((result) => {
      if (result.ok) setSnapshot(result.value);
      else setError(result.error.message);
    });
    return unsubscribe;
  }, []);
  function run(command: UpdateCommand): void {
    setError(null);
    void (command === 'install' ? flush() : Promise.resolve())
      .then(() => window.prezi.updateAction(command))
      .then((result) => {
        if (result.ok) setSnapshot(result.value);
        else setError(result.error.message);
      });
  }
  return { snapshot, error, run };
}

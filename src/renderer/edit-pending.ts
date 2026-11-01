import { createContext, useContext } from 'react';

export const editPendingContext = createContext(false);
export function useEditPending(): boolean {
  return useContext(editPendingContext);
}

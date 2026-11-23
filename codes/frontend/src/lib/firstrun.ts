// The guided first run's memory: whether the reader has opened their plan, and whether they put the checklist away. Per device,
// in localStorage (the account itself says whether a profile and conditions exist).
const PLAN = 'pathya.firstrun.plan';
const HIDE = 'pathya.firstrun.hide';

const read = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const write = (key: string): void => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // private mode: forgotten with the tab
  }
};

export const planSeen = (): boolean => read(PLAN);
export const markPlanSeen = (): void => write(PLAN);
export const checklistHidden = (): boolean => read(HIDE);
export const hideChecklist = (): void => write(HIDE);

import { NavTab } from '../types';

export const PRIMARY_NAV_ITEMS: ReadonlyArray<{ id: NavTab; label: string }> = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'tasks', label: 'Công việc' },
  { id: 'calendar', label: 'Lịch' },
  { id: 'personal', label: 'Cá nhân' },
  { id: 'reports', label: 'Báo cáo' },
];

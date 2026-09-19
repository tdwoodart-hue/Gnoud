import { NavTab } from '../types';

export const PRIMARY_NAV_ITEMS: ReadonlyArray<{ id: NavTab; label: string }> = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'tasks', label: 'Công việc' },
  { id: 'nutrition', label: 'Dinh dưỡng' },
  { id: 'personal', label: 'Cá nhân' },
  { id: 'reports', label: 'Báo cáo' },
];

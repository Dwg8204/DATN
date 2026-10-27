import { Bell, ClipboardList, LayoutDashboard, LogOut, Users } from 'lucide-react';

export const ADMIN_NAVIGATION = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { label: 'Test Management', to: '/admin/tests?purpose=EXAM', icon: ClipboardList, roles: ['ADMIN'], children: [
    { label: 'Mock tests', to: '/admin/tests?purpose=EXAM' },
    { label: 'Practice', to: '/admin/tests?purpose=PRACTICE' },
  ] },
  { label: 'User Management', to: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Topic management', to: '/admin/learning-topics', activePaths: ['/admin/learning-topics', '/admin/topic-labels'], icon: ClipboardList, roles: ['ADMIN'] },
  { label: 'Notification', to: '/admin/notifications', icon: Bell, roles: ['ADMIN'] },
];

export const ADMIN_LOGOUT_ITEM = { label: 'Log out', to: '/', icon: LogOut };

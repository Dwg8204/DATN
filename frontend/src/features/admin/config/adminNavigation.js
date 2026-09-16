import { Bell, ClipboardList, LayoutDashboard, LogOut, MessageSquareText, Users } from 'lucide-react';

export const ADMIN_NAVIGATION = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { label: 'Test Management', to: '/admin/tests', icon: ClipboardList, roles: ['ADMIN', 'TEACHER'] },
  { label: 'User Management', to: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Feedback', to: '/admin/feedback', icon: MessageSquareText, roles: ['ADMIN'] },
  { label: 'Notification', to: '/admin/notifications', icon: Bell, roles: ['ADMIN'] },
];

export const ADMIN_LOGOUT_ITEM = { label: 'Log out', to: '/', icon: LogOut };

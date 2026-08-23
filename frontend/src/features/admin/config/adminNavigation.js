import { Bell, ClipboardList, LayoutDashboard, LogOut, MessageSquareText, Users } from 'lucide-react';

export const ADMIN_NAVIGATION = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Test Management', to: '/admin/tests', icon: ClipboardList },
  { label: 'User Management', to: '/admin/users', icon: Users },
  { label: 'Feedback', to: '/admin/feedback', icon: MessageSquareText },
  { label: 'Notification', to: '/admin/notifications', icon: Bell },
];

export const ADMIN_LOGOUT_ITEM = { label: 'Log out', to: '/', icon: LogOut };

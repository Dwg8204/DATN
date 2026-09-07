import { makeCredential, checkCredential } from '../../../auth/utils/mockCredentials.js';
import { validateManagedUser } from '../validation/userValidation.js';
const STORAGE_KEY = 'aptimate_admin_users';
const seedUsers = [
  { id: 'admin-1', role: 'admin', name: 'Hung To', email: 'tongochung9308@gmail.com', status: 'Active', joinedAt: '2025-01-05' },
  { id: 'admin-2', role: 'admin', name: 'Olivia Rhye', email: 'olivia@aptimate.com', status: 'Active', joinedAt: '2025-02-12' },
  { id: 'teacher-1', role: 'teacher', name: 'Phoenix Baker', email: 'phoenix@aptimate.com', status: 'Active', joinedAt: '2025-03-08' },
  { id: 'teacher-2', role: 'teacher', name: 'Lana Steiner', email: 'lana@aptimate.com', status: 'Inactive', joinedAt: '2025-04-16' },
  { id: 'teacher-3', role: 'teacher', name: 'Demi Wilkinson', email: 'demi@aptimate.com', status: 'Active', joinedAt: '2025-05-21' },
  { id: 'user-1', role: 'user', name: 'Candice Wu', email: 'candice@example.com', status: 'Active', joinedAt: '2025-06-10' },
  { id: 'user-2', role: 'user', name: 'Natali Craig', email: 'natali@example.com', status: 'Active', joinedAt: '2025-07-04' },
  { id: 'user-3', role: 'user', name: 'Drew Cano', email: 'drew@example.com', status: 'Inactive', joinedAt: '2025-08-19' },
  { id: 'user-4', role: 'user', name: 'Orlando Diggs', email: 'orlando@example.com', status: 'Active', joinedAt: '2025-09-07' },
  { id: 'user-5', role: 'user', name: 'Andi Lane', email: 'andi@example.com', status: 'Active', joinedAt: '2025-10-14' },
  { id: 'user-6', role: 'user', name: 'Kate Morrison', email: 'kate@example.com', status: 'Inactive', joinedAt: '2025-11-02' },
];


function clean(user) {
  const { specialization, password, confirmPassword, ...record } = user;
  return record;
}
export function getManagedUsers() {
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); return (Array.isArray(data) ? data : seedUsers).map(clean); } catch { return seedUsers.map(clean); }
}
function persist(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users.map(clean)));
  window.dispatchEvent(new Event('managed-users-updated'));
}
export async function saveManagedUser(input) {
  const users = getManagedUsers();
  const index = users.findIndex(item => item.id === input.id);
  if (input.id) {
    if (index < 0) throw new Error('Account not found.');
    const original = users[index];
    const nextRole = original.role === 'user' ? 'teacher' : original.role === 'teacher' ? 'admin' : null;
    if (!nextRole || input.role !== nextRole) throw new Error('Only User → Teacher or Teacher → Admin is permitted.');
    users[index] = { ...original, role: nextRole };
    persist(users);
    return users[index];
  }
  const error = validateManagedUser(input, users);
  if (error) throw new Error(error);
  const legacy = JSON.parse(localStorage.getItem('aptimate.mock_users') || '[]');
  if (legacy.some(u => u.email.trim().toLowerCase() === input.email.trim().toLowerCase())) throw new Error('This email address is already in use.');
  const credential = await makeCredential(input.password);
  const user = { id: crypto.randomUUID(), name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, status: input.status === 'Inactive' ? 'Inactive' : 'Active', joinedAt: new Date().toISOString(), credential };
  const latest = getManagedUsers();
  const latestError = validateManagedUser(input, latest);
  if (latestError) throw new Error(latestError);
  persist([user, ...latest]);
  return user;
}
export function deleteManagedUser(id) {
  const users = getManagedUsers();
  const target = users.find(user => user.id === id);
  if (!target || target.role === 'admin') return false;
  persist(users.filter(user => user.id !== id));
  return true;
}
export async function authenticateManagedUser(email, password) {
  const user = getManagedUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.status !== 'Active' || !await checkCredential(password, user.credential)) return null;
  const { credential, ...profile } = user;
  return profile;
}

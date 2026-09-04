const STORAGE_KEY = 'aptimate_admin_users';

const seedUsers = [
  { id: 'admin-1', role: 'admin', name: 'Hung To', email: 'tongochung9308@gmail.com', status: 'Active', joinedAt: '2025-01-05' },
  { id: 'admin-2', role: 'admin', name: 'Olivia Rhye', email: 'olivia@aptimate.com', status: 'Active', joinedAt: '2025-02-12' },
  { id: 'teacher-1', role: 'teacher', name: 'Phoenix Baker', email: 'phoenix@aptimate.com', status: 'Active', joinedAt: '2025-03-08', specialization: 'Listening' },
  { id: 'teacher-2', role: 'teacher', name: 'Lana Steiner', email: 'lana@aptimate.com', status: 'Inactive', joinedAt: '2025-04-16', specialization: 'Writing' },
  { id: 'teacher-3', role: 'teacher', name: 'Demi Wilkinson', email: 'demi@aptimate.com', status: 'Active', joinedAt: '2025-05-21', specialization: 'Grammar & Vocabulary' },
  { id: 'user-1', role: 'user', name: 'Candice Wu', email: 'candice@example.com', status: 'Active', joinedAt: '2025-06-10' },
  { id: 'user-2', role: 'user', name: 'Natali Craig', email: 'natali@example.com', status: 'Active', joinedAt: '2025-07-04' },
  { id: 'user-3', role: 'user', name: 'Drew Cano', email: 'drew@example.com', status: 'Inactive', joinedAt: '2025-08-19' },
  { id: 'user-4', role: 'user', name: 'Orlando Diggs', email: 'orlando@example.com', status: 'Active', joinedAt: '2025-09-07' },
  { id: 'user-5', role: 'user', name: 'Andi Lane', email: 'andi@example.com', status: 'Active', joinedAt: '2025-10-14' },
  { id: 'user-6', role: 'user', name: 'Kate Morrison', email: 'kate@example.com', status: 'Inactive', joinedAt: '2025-11-02' },
];

export function getManagedUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedUsers; } catch { return seedUsers; }
}

function persist(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event('managed-users-updated'));
  return users;
}

export function saveManagedUser(input) {
  const users = getManagedUsers();
  const user = { ...input, id: input.id || `${input.role}-${Date.now()}`, joinedAt: input.joinedAt || new Date().toISOString().slice(0, 10) };
  const index = users.findIndex((item) => item.id === user.id);
  if (index >= 0) users[index] = user; else users.unshift(user);
  persist(users);
  return user;
}

export function deleteManagedUser(id) {
  const target = getManagedUsers().find((user) => user.id === id);
  if (!target || target.role === 'admin') return false;
  persist(getManagedUsers().filter((user) => user.id !== id));
  return true;
}

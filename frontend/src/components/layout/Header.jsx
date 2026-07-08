import { NavLink } from 'react-router-dom';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Giới thiệu', to: '/introduction' },
  { label: 'Practice', to: '/practice-exam' },
  { label: 'Writing', to: '/writing-test' },
  { label: 'AI Chatbot', to: '/ai-chatbot' },
];

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="site-header surface">
      <div className="container site-header__inner">
        <NavLink to="/" className="brand" end>
          <span className="brand__mark">A</span>
          <span className="brand__text">
            <strong>AptiMate</strong>
            <small>React core frontend</small>
          </span>
        </NavLink>

        <nav className="site-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `site-nav__link ${isActive ? 'site-nav__link--active' : ''}`.trim()}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          {isAuthenticated ? (
            <>
              <span className="user-chip">{user?.name ?? 'Học sinh'}</span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm">Đăng nhập</Button>
          )}
        </div>
      </div>
    </header>
  );
}

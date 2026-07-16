import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function MainLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', background: '#FFFEFC', gap: '40px', overflowX: 'hidden' }}>
        <Header />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

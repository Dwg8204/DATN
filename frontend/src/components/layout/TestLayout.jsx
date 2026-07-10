import { Outlet } from 'react-router-dom';
import TestHeader from './TestHeader';

export default function TestLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ alignSelf: 'stretch', background: '#FFFEFC', flex: 1 }}>
        <TestHeader />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

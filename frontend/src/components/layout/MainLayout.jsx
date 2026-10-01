import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SkillSubNavigation from './SkillSubNavigation';
import ChatAssistantWidget from '../../features/ai-chatbot/components/ChatAssistantWidget';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <Header />
        <SkillSubNavigation />
        <main>
          <Outlet />
        </main>
        <Footer />
        <ChatAssistantWidget />
      </div>
    </div>
  );
}

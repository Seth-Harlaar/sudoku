import { NavBar } from './components/NavBar.tsx';
import { GameScreen } from './components/GameScreen.tsx';
import { LibraryPage } from './components/Library/LibraryPage.tsx';
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import { useViewStore } from './state/viewStore.ts';
import styles from './App.module.css';

export default function App() {
  const page = useViewStore((s) => s.page);
  return (
    <div className={styles.app}>
      <NavBar />
      <main className={styles.main}>
        {page === 'game' ? <GameScreen /> : <LibraryPage />}
      </main>
      <UpdatePrompt />
    </div>
  );
}

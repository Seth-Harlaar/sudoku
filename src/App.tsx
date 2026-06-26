import { NavBar } from './components/NavBar.tsx';
import { GameScreen } from './components/GameScreen.tsx';
import { UpdatePrompt } from './components/UpdatePrompt.tsx';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.app}>
      <NavBar />
      <main className={styles.main}>
        <GameScreen />
      </main>
      <UpdatePrompt />
    </div>
  );
}

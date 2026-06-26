import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

/**
 * Surfaces the service-worker lifecycle (FR-A4): prompts the user to reload when a
 * new version is available, and confirms the app is ready to work offline.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.message}>
        {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
      </span>
      <div className={styles.actions}>
        {needRefresh && (
          <button
            className={styles.primary}
            onClick={() => void updateServiceWorker(true)}
          >
            Reload
          </button>
        )}
        <button className={styles.dismiss} onClick={close}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

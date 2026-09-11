import type { IntroPhrase } from '../lib/intro-phrases';
import styles from './intro-overlay.module.css';

interface IntroOverlayProps {
  /** null — вступление закончилось, слой гаснет. */
  readonly phrase: IntroPhrase | null;
  readonly visible: boolean;
}

/**
 * Вступительные реплики поверх сцены.
 *
 * Слой декоративный и помечен `aria-hidden`: текст, сменяющийся по таймеру,
 * скринридер бы перебивал сам себя, а вся содержательная часть тех же фраз —
 * имя и роль — и так есть в разметке страницы (§7).
 *
 * Компонент презентационный: расписание живёт в `useIntroSequence`, здесь
 * только вывод.
 */
export function IntroOverlay({ phrase, visible }: IntroOverlayProps) {
  return (
    <div className={styles.overlay} data-visible={visible} aria-hidden="true">
      {phrase === null ? null : (
        // key обязателен: без него React переиспользует узел, и анимация
        // проявления не перезапустится на новой реплике.
        <p key={phrase.id} className={styles.phrase} data-long={phrase.text.length > 30}>
          {phrase.text}
        </p>
      )}
    </div>
  );
}

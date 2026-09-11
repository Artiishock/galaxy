import Link from 'next/link';
import type { ReactNode } from 'react';

import { ScrollArea } from '../scroll-area/scroll-area';
import styles from './zone-page.module.css';

interface ZonePageProps {
  readonly title: string;
  readonly lead?: string;
  readonly children: ReactNode;
}

/**
 * Зона резюме — панель поверх орбитальной сцены.
 *
 * Сцена остаётся смонтированной в layout, поэтому переход сюда её не
 * перезапускает: планеты продолжают лететь за панелью, а закрытие возвращает
 * ровно то состояние, которое накопилось.
 *
 * Это обычная страница, а не модальное окно: у неё свой URL и свой `<h1>`,
 * фокус не запирается, а «Close» — просто ссылка на главную (§7).
 */
export function ZonePage({ title, lead, children }: ZonePageProps) {
  return (
    <main id="main" className={styles.layer}>
      <article className={styles.panel}>
        <div className={styles.top}>
          <p className={styles.eyebrow}>Resume</p>
          <Link href="/" className={styles.close}>
            Close
            <span aria-hidden="true">×</span>
          </Link>
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {lead === undefined ? null : <p className={styles.lead}>{lead}</p>}
        </header>

        <ScrollArea label={`${title} — section content`}>
          <div className={styles.content}>{children}</div>
        </ScrollArea>

        <Link href="/" className={styles.back}>
          <span aria-hidden="true">←</span> Back to the orbit
        </Link>
      </article>
    </main>
  );
}

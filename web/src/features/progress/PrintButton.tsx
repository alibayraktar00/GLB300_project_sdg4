'use client';

import { Button } from '@/components/Button';
import { tr } from '@/strings/tr';

import styles from './Progress.module.css';

/** Tarayıcının yazdırma penceresini açar. Gezinme ve üst çubuk yazdırmada gizlenir; bu düğme de basılmaz. */
export function PrintButton() {
  return (
    <div className={styles.noPrint}>
      <Button variant="secondary" onClick={() => window.print()}>
        {tr.childProgress.print}
      </Button>
    </div>
  );
}

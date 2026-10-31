import type { Metadata } from 'next';

import { Card, CardContent } from '@/components/Card';
import { EmptyState } from '@/components/StateViews';
import styles from '@/features/questions/page.module.css';
import { loadMyStudents } from '@/server/family';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.family.myStudentsTitle };
export const dynamic = 'force-dynamic';

/** Gönüllünün aktif eşleşmesindeki öğrenciler: yalnızca rumuz ve sınıf. Soyad, okul, kullanıcı adı hiç gelmez. */
export default async function MyStudentsPage() {
  const students = await loadMyStudents();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.family.myStudentsTitle}</h1>
      <p className={styles.note}>{tr.family.myStudentsHelp}</p>
      {students.length === 0 ? (
        <EmptyState title={tr.family.myStudentsEmpty} message="" />
      ) : (
        <ul className={styles.pool}>
          {students.map((student) => (
            <li key={student.matchId}>
              <Card>
                <CardContent title={student.nickname} description={tr.child.gradeOption(student.grade)} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

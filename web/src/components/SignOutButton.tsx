import { signOut } from '@/app/giris/actions';
import { Button } from '@/components/Button';
import { tr } from '@/strings/tr';

/** Çıkış düğmesi: sunucu eylemine bağlı düz form (JavaScript olmadan da çalışır). */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" icon="logout">
        {tr.auth.signOut}
      </Button>
    </form>
  );
}

// Her testten önce yüklenir. `toBeInTheDocument()` gibi ek denetimleri ekler.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Her testten sonra ekrana çizilen bileşenleri temizle.
afterEach(() => cleanup());

'use client';
import { Button } from '@mui/material';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function LangToggle() {
  const { lang, toggle } = useLanguage();
  return (
    <Button
      onClick={toggle}
      size="small"
      variant="outlined"
      startIcon={<Languages size={16} />}
      sx={{ minWidth: 0, px: 1.5, fontWeight: 700 }}
      aria-label={lang === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      {lang === 'en' ? 'FR' : 'EN'}
    </Button>
  );
}

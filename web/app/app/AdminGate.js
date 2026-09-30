'use client';
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Lock } from 'lucide-react';
import { API, getAdminToken, setAdminToken } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import LangToggle from './LangToggle';

export default function AdminGate({ children }) {
  const { t } = useLanguage();
  const [needed, setNeeded] = useState(null);
  const [ok, setOk] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/status`)
      .then((r) => r.json())
      .then((d) => {
        setNeeded(d.protected);
        setOk(!d.protected || !!getAdminToken());
      })
      .catch(() => { setNeeded(false); setOk(true); });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setAdminToken(password);
    let res;
    try {
      res = await fetch(`${API}/api/docs`, { headers: { Authorization: `Bearer ${password}` } });
    } catch {
      setAdminToken(null);
      setBusy(false);
      setError(t('couldNotReachApiShort'));
      return;
    }
    setBusy(false);
    if (res.ok) setOk(true);
    else { setAdminToken(null); setError(t('incorrectPassword')); }
  };

  if (needed === null) return null;
  if (ok) return children;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="xs">
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <LangToggle />
        </Stack>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Lock size={22} />
            </Box>
            <Typography variant="h5" fontWeight={800}>{t('appName')}</Typography>
            <Typography color="text.secondary" align="center">{t('protectedTitle')}</Typography>
          </Stack>
          <Stack component="form" onSubmit={submit} spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label={t('adminPassword')} type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
            <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? '…' : t('unlock')}</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

'use client';
import { useEffect, useState } from 'react';
import {
  Alert, AppBar, Box, Button, ButtonGroup, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider, List, ListItemButton, ListItemText,
  MenuItem, Paper, Stack, Switch, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material';
import { BookOpen, Download, ExternalLink, FileText, History, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, downloadExport } from '../../lib/api';
import { LanguageProvider, useLanguage } from '../../lib/i18n';
import AdminGate from './AdminGate';
import LangToggle from './LangToggle';

function Versions({ doc, onRestored }) {
  const { t } = useLanguage();
  const [versions, setVersions] = useState(null);
  useEffect(() => { setVersions(null); api(`/docs/${doc._id}/versions`).then(setVersions).catch(() => setVersions([])); }, [doc._id, doc.updatedAt]);

  if (versions === null) return <CircularProgress size={22} />;
  if (!versions.length) return <Typography variant="body2" color="text.secondary">{t('noVersions')}</Typography>;
  return (
    <List dense disablePadding>
      {versions.map((v) => (
        <ListItemButton
          key={v._id}
          sx={{ borderRadius: 1.5, mb: 0.5 }}
          title={t('restore')}
          onClick={async () => onRestored(await api(`/docs/${doc._id}/versions/${v._id}/restore`, { method: 'POST' }))}
        >
          <ListItemText primary={v.title} secondary={new Date(v.createdAt).toLocaleString()} />
        </ListItemButton>
      ))}
    </List>
  );
}

function Editor() {
  const { t } = useLanguage();
  const [docs, setDocs] = useState(null);
  const [cur, setCur] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'success'|'error', text }
  const [tab, setTab] = useState('write');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => setDocs(await api('/docs'));
  useEffect(() => {
    load().catch((err) => {
      if (err.message === 'NETWORK_ERROR') return setMsg({ kind: 'error', text: t('couldNotReachApi') });
      if (err.message === 'UNAUTHORIZED') return window.location.reload(); // password changed/expired: show the lock screen again
      setMsg({ kind: 'error', text: err.message });
    });
  }, []); // eslint-disable-line

  const select = async (id) => { setMsg(null); setTab('write'); setDirty(false); setCur(await api(`/docs/${id}`)); };
  const patch = (fields) => { setCur((c) => ({ ...c, ...fields })); setDirty(true); };

  const create = async () => {
    const d = await api('/docs', { method: 'POST', body: { title: t('newDocument'), content: `# ${t('newDocument')}\n\n…` } });
    await load();
    setCur(d);
    setDirty(false);
    setTab('write');
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const { title, content, published, kind, priceCents, customDomain } = cur;
      const saved = await api(`/docs/${cur._id}`, { method: 'PUT', body: { title, content, published, kind, priceCents, customDomain } });
      setCur(saved);
      setDirty(false);
      await load();
      setMsg({ kind: 'success', text: t('saved') });
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api(`/docs/${cur._id}`, { method: 'DELETE' });
    setConfirmDelete(false);
    setCur(null);
    await load();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Box
            component="a" href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit' }}
            aria-label={t('backHome')}
          >
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'monospace', fontSize: 14 }}>M↓</Box>
            <Typography fontWeight={800}>{t('appName')}</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          {cur?.published && (
            <Button size="small" href={`/d/${cur.slug}`} target="_blank" startIcon={<ExternalLink size={16} />}>{t('viewSite')}</Button>
          )}
          <LangToggle />
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr 1fr' }, gap: 2, p: 2, maxWidth: 1400, mx: 'auto' }}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, alignSelf: 'start' }}>
          <Button fullWidth variant="contained" color="secondary" onClick={create} startIcon={<Plus size={18} />} sx={{ mb: 1.5 }}>
            {t('newDocument')}
          </Button>
          {docs === null ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : docs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{t('noDocuments')}</Typography>
          ) : (
            <List dense disablePadding>
              {docs.map((d) => (
                <ListItemButton key={d._id} selected={cur?._id === d._id} onClick={() => select(d._id)} sx={{ borderRadius: 2, mb: 0.5, alignItems: 'flex-start' }}>
                  {d.kind === 'book' ? <BookOpen size={16} style={{ marginTop: 3, marginRight: 8, flexShrink: 0 }} /> : <FileText size={16} style={{ marginTop: 3, marginRight: 8, flexShrink: 0 }} />}
                  <ListItemText
                    primary={d.title}
                    secondary={<Chip size="small" label={d.published ? t('published') : t('draft')} color={d.published ? 'success' : 'default'} variant={d.published ? 'filled' : 'outlined'} sx={{ mt: 0.5, height: 20, fontSize: 11 }} />}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        {cur ? (
          <>
            <Stack spacing={2}>
              <ButtonGroup size="small">
                <Button variant={tab === 'write' ? 'contained' : 'outlined'} onClick={() => setTab('write')} startIcon={<FileText size={16} />}>{t('write')}</Button>
                <Button variant={tab === 'settings' ? 'contained' : 'outlined'} onClick={() => setTab('settings')} startIcon={<Settings2 size={16} />}>{t('settings')}</Button>
                <Button variant={tab === 'history' ? 'contained' : 'outlined'} onClick={() => setTab('history')} startIcon={<History size={16} />}>{t('history')}</Button>
              </ButtonGroup>

              {tab === 'write' && (
                <>
                  <TextField label={t('title')} value={cur.title} onChange={(e) => patch({ title: e.target.value })} fullWidth />
                  <TextField
                    label={t('markdown')} multiline minRows={16} value={cur.content}
                    onChange={(e) => patch({ content: e.target.value })}
                    InputProps={{ sx: { fontFamily: 'JetBrains Mono, monospace', fontSize: 14 } }}
                    fullWidth
                  />
                </>
              )}

              {tab === 'settings' && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack spacing={2.5}>
                    <TextField select label={t('type')} value={cur.kind} onChange={(e) => patch({ kind: e.target.value })}>
                      <MenuItem value="doc">{t('documentation')}</MenuItem>
                      <MenuItem value="book">{t('book')}</MenuItem>
                    </TextField>
                    {cur.kind === 'book' && (
                      <TextField
                        label={t('price')} type="number" inputProps={{ min: 0, step: 0.5 }}
                        value={cur.priceCents / 100}
                        onChange={(e) => patch({ priceCents: Math.round(Number(e.target.value) * 100) })}
                        helperText={t('priceHelp')}
                      />
                    )}
                    <TextField
                      label={t('customDomain')} placeholder="docs.example.com"
                      value={cur.customDomain || ''} onChange={(e) => patch({ customDomain: e.target.value })}
                      helperText={t('domainHelp')}
                    />
                    <Divider />
                    <Box>
                      <Typography fontWeight={700} gutterBottom>{t('export')}</Typography>
                      <Stack direction="row" spacing={1}>
                        {['md', 'pdf', 'epub'].map((fmt) => (
                          <Button key={fmt} size="small" variant="outlined" startIcon={<Download size={14} />} onClick={() => downloadExport(cur._id, fmt, cur.slug)}>.{fmt}</Button>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {tab === 'history' && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Versions doc={cur} onRestored={(d) => { setCur(d); setDirty(false); setTab('write'); }} />
                </Paper>
              )}

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={save} disabled={saving || !dirty} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={16} />}>
                  {saving ? t('saving') : t('saveChanges')}
                </Button>
                <Tooltip title={cur.published ? t('published') : t('draft')}>
                  <Switch checked={cur.published} onChange={(e) => patch({ published: e.target.checked })} />
                </Tooltip>
                <Button color="error" variant="text" startIcon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>{t('delete')}</Button>
              </Stack>

              {msg && <Alert severity={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Alert>}
              {cur.published && (
                <Typography variant="body2" color="text.secondary">
                  {t('publicLink')}: <a href={`/d/${cur.slug}`} target="_blank" rel="noreferrer">/d/{cur.slug}</a>
                </Typography>
              )}
            </Stack>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, overflow: 'auto', maxHeight: '85vh' }}>
              <Typography variant="overline" color="text.secondary">{t('preview')}</Typography>
              <ReactMarkdown>{cur.content}</ReactMarkdown>
            </Paper>
          </>
        ) : (
          <Box sx={{ gridColumn: { md: 'span 2' }, display: 'grid', placeItems: 'center', minHeight: 320 }}>
            <Typography color="text.secondary" align="center" sx={{ maxWidth: 360 }}>{t('emptyState')}</Typography>
          </Box>
        )}
      </Box>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{t('deleteTitle')}</DialogTitle>
        <DialogContent><DialogContentText>{cur && t('deleteBody', cur.title)}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={remove}>{t('confirmDelete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Page() {
  return (
    <LanguageProvider>
      <AdminGate><Editor /></AdminGate>
    </LanguageProvider>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { API } from '../../../lib/api';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

async function buy(provider, slug) {
  const res = await fetch(`${API}/api/checkout/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, returnTo: window.location.origin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not start checkout.');
  window.location.href = data.url;
}

export default function BuyBook({ slug, priceCents, orderToken, paypalOrderId }) {
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderToken) return;
    (async () => {
      if (paypalOrderId) {
        await fetch(`${API}/api/checkout/paypal/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: orderToken, paypalOrderId }),
        }).catch(() => {});
      }
      const res = await fetch(`${API}/api/orders/${orderToken}`);
      if (res.ok) setOrder(await res.json());
    })();
  }, [orderToken, paypalOrderId]);

  if (orderToken) {
    if (!order) return null;
    if (order.status !== 'paid')
      return <Alert severity="info" sx={{ mt: 3 }}>Payment is still processing. Refresh this page in a moment.</Alert>;
    return (
      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Typography fontWeight={700} gutterBottom>Thanks! Your book is ready.</Typography>
        <Stack direction="row" spacing={1}>
          {['epub', 'pdf'].map((f) => (
            <Button key={f} variant="outlined" href={`${API}/api/orders/${orderToken}/download.${f}`}>Download .{f}</Button>
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
      <Typography fontWeight={700} gutterBottom>Get the full book — {fmt(priceCents)}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => buy('stripe', slug).catch((e) => setError(e.message))}>Pay with card</Button>
        <Button variant="outlined" onClick={() => buy('paypal', slug).catch((e) => setError(e.message))}>Pay with PayPal</Button>
      </Stack>
    </Paper>
  );
}

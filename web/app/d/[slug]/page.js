import { notFound } from 'next/navigation';
import { Button, Container, Stack, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import BuyBook from './BuyBook';

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getDoc(slug) {
  const res = await fetch(`${API}/api/docs/public/${slug}`, { cache: 'no-store' }).catch(() => null);
  return res && res.ok ? res.json() : null;
}

export async function generateMetadata({ params }) {
  const doc = await getDoc(params.slug);
  return { title: doc ? `${doc.title} | MarkDocs` : 'Not found' };
}

export default async function PublicDoc({ params, searchParams }) {
  const doc = await getDoc(params.slug);
  if (!doc) notFound();
  const forSale = doc.kind === 'book' && doc.priceCents > 0;
  const freeToDownload = !doc.paywalled; // documentation, or a book priced at 0

  return (
    <Container maxWidth="md" component="main" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>{doc.title}</Typography>
      <ReactMarkdown>{doc.content}</ReactMarkdown>

      {doc.paywalled && (
        <Typography color="text.secondary" sx={{ my: 2 }}>
          This is a preview. Buy the book below to read the rest and download it as EPUB or PDF.
        </Typography>
      )}

      {freeToDownload && (
        <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', mr: 1 }}>Download:</Typography>
          {['md', 'pdf', 'epub'].map((fmt) => (
            <Button key={fmt} size="small" variant="outlined" href={`${API}/api/docs/public/${params.slug}/export.${fmt}`}>.{fmt}</Button>
          ))}
        </Stack>
      )}

      {forSale && <BuyBook slug={params.slug} priceCents={doc.priceCents} orderToken={searchParams?.order} paypalOrderId={searchParams?.token} />}
    </Container>
  );
}

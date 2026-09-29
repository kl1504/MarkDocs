import { notFound } from 'next/navigation';
import { Container, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import BuyBook from './BuyBook';

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getDoc(slug) {
  const res = await fetch(`${API}/api/docs/public/${slug}`, { cache: 'no-store' }).catch(() => null);
  return res && res.ok ? res.json() : null;
}

export async function generateMetadata({ params }) {
  const doc = await getDoc(params.slug);
  return { title: doc ? `${doc.title} | Folio` : 'Not found' };
}

export default async function PublicDoc({ params, searchParams }) {
  const doc = await getDoc(params.slug);
  if (!doc) notFound();
  const forSale = doc.kind === 'book' && doc.priceCents > 0;

  return (
    <Container maxWidth="md" component="main" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>{doc.title}</Typography>
      <ReactMarkdown>{doc.content}</ReactMarkdown>
      {doc.paywalled && (
        <Typography color="text.secondary" sx={{ my: 2 }}>
          This is a preview. Buy the book below to read the rest and download it as EPUB or PDF.
        </Typography>
      )}
      {forSale && <BuyBook slug={params.slug} priceCents={doc.priceCents} orderToken={searchParams?.order} paypalOrderId={searchParams?.token} />}
    </Container>
  );
}

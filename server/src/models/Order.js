import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    doc: { type: mongoose.Schema.Types.ObjectId, ref: 'Doc', required: true },
    // Snapshot of the book at purchase time, so a buyer always gets exactly what they paid
    // for, even if the document is edited or deleted afterwards.
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: String, required: true },
    provider: { type: String, enum: ['stripe', 'paypal'], required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    amountCents: { type: Number, required: true },
    providerRef: String,
    token: { type: String, required: true, unique: true }, // unguessable; acts as the buyer's receipt/download key
    // Only set while pending; removed once paid, so paid orders never expire but
    // abandoned checkouts are cleaned up automatically after 24h.
    expireAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);
orderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Order', orderSchema);

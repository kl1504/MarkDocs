import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    doc: { type: mongoose.Schema.Types.ObjectId, ref: 'Doc', required: true },
    provider: { type: String, enum: ['stripe', 'paypal'], required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    amountCents: { type: Number, required: true },
    providerRef: String,
    token: { type: String, required: true, unique: true }, // unguessable; acts as the buyer's receipt/download key
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);

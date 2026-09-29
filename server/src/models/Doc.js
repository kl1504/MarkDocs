import mongoose from 'mongoose';

const docSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true },
    content: { type: String, default: '', maxlength: 500_000 },
    kind: { type: String, enum: ['doc', 'book'], default: 'doc' },
    published: { type: Boolean, default: false },
    priceCents: { type: Number, min: 0, max: 100_000_00, default: 0 }, // > 0 on a published book = paid
    customDomain: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/, 'Enter a valid domain, like docs.example.com.'],
    },
  },
  { timestamps: true }
);
docSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('Doc', docSchema);

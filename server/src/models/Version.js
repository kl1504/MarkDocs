import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    doc: { type: mongoose.Schema.Types.ObjectId, ref: 'Doc', required: true, index: true },
    title: String,
    content: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Version', versionSchema);

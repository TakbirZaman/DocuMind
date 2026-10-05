const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  index: { type: Number, required: true },
  embedding: { type: [Number], required: true },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  pageCount: { type: Number, default: 0 },
  charCount: { type: Number, default: 0 },
  chunks: [chunkSchema],
}, {
  timestamps: true,
});

// Index for faster lookups by uploadedAt
documentSchema.index({ uploadedAt: -1 });

module.exports = mongoose.model('Document', documentSchema);

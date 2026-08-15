const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  companyCode: { type: String },
  
  name: { type: String },
  companyName: { type: String },
  companyAddress: { type: String },
  contact: { type: String },
  numberOfUsers: { type: Number },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'Observer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);

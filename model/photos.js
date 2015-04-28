var mongoose = require('mongoose');  
var photoSchema = new mongoose.Schema({  
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  twitter: { type: String, required: false },
  email: { type: String, required: true },
  company: { type: String, required: true },
  title: { type: String, required: true },
  newsletter: Boolean,
  contentlearn: { type: Array, required: false },
  contentcode: { type: Array, required: false },
  contentdeploy: { type: Array, required: false },
  photos: { type: Array, required: false },
  date: { type: Date, default: Date.now },
  uniqueurl: { type: String, unique: true }
});
mongoose.model('Photo', photoSchema); 
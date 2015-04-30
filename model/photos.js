var mongoose = require('mongoose');  
var photoSchema = new mongoose.Schema({  
  fname: { type: String, required: true }, //first name
  lname: { type: String, required: true }, //last name
  twitter: { type: String, required: false }, //twitter name
  email: { type: String, required: true }, //email 
  company: { type: String, required: true }, //company
  title: { type: String, required: true }, //title
  newsletter: Boolean, //subscribe to the newsletter
  contentlearn: { type: Array, required: false }, //the LEARN content of the signup form 
  contentcode: { type: Array, required: false }, //the CODE content of the signup form
  contentdeploy: { type: Array, required: false }, //the DEPLOY content of the signup form
  photos: { type: Array, required: false }, //stores the location of the photos in ECS, not the actual photos themself
  date: { type: Date, default: Date.now }, //date of creation
  uniqueurl: { type: String, unique: true } //the URL used for accessing data with the Show view
});
mongoose.model('Photo', photoSchema); 
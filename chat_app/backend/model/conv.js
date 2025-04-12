const mongoose = require('mongoose');

const convSchema = new mongoose.Schema({
  members : {
    type : Array
  },
  
})
const conversation = mongoose.model('conversation', convSchema)

module.exports = conversation;
const mongoose = require('mongoose');

const messegeSchema = new mongoose.Schema({
 conversationID : {
    type : String
 },
 sender : {
    type : String
 },
 messege : {
    type : String
 }
})
const Message = mongoose.model('messege', messegeSchema)

module.exports = Message;
 
 
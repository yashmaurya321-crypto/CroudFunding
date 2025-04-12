const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name : {
    type : String,
    require : true
  },
  email : {
    type : String,
    require : true,
    unique : true
  },
  password : {
      type : String,
      unique : true,
      require : true
  },
  token :{
    type : String
  },
  request : {
    type : Array
  },
  
})
const user = mongoose.model('user', userSchema)

module.exports = user;
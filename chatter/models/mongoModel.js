"use strict";
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;


var User = new Schema({
  userID:{type:String, required:true, index:{unique:true, dropDups:true}}
  , password:{type:String, required:true}
  , created_at:Date
});

User.pre('save', function(next) {
  if (this.isNew) {
    this.created_at = new Date();
  }
  next();
});

mongoose.model('User', User);

var Message = new Schema({
  userID:{type:String, required:true}
  , content:{type:String, required:true}
  , created_at:Date
});

Message.pre('save', function(next) {
  if (this.isNew) {
    this.created_at = new Date();
  }
  next();
});

mongoose.model('Message', Message);

module.exports.createConnection = function(url) {
  return mongoose.createConnection(url);
};


var assert = require('assert')
  , should = require('should')
  , mongoModel = require('../models/mongoModel.js')
  , db = mongoModel.createConnection('mongodb://localhost:27017/test');

var User = db.model('User');
var Message = db.model('Message');

describe('User', function() {
  describe('#save()', function() {
    var tuser1 = new User({userID:'tuser1', password:'tpassword1'});

    it("新規Userを登録する", function(done) {
      tuser1.save(function(err, doc) {
	doc.userID.should.equal("tuser1");
	doc.password.should.equal("tpassword1");
	done();
      });
    });


    afterEach(function(done) {
      tuser1.remove( function() {
	done();
      });
    });
  });

  describe('#find()', function() {
    var tuser1 = new User({userID:'tuser1', password:'tpassword1'});

    beforeEach(function(done) {
      tuser1.save(function(err, doc) {
	done();
      });
    });


    it("対応する１件のユーザを見つける", function(done) {
      User.findOne({userID:'tuser1'}).exec(function(err, doc) {
	doc.userID.should.equal("tuser1");
	doc.password.should.equal("tpassword1");
	done();
      });
    });

    afterEach(function(done) {
      tuser1.remove( function() {
	done();
      });
    });
  });

});

describe('Message', function() {
  describe('#save()', function() {
    var tmessage1 = new Message({userID:'tuser1', content:'tcontent1'});

    it("新規Messageを登録する", function(done) {
      tmessage1.save(function(err, doc) {
	doc.userID.should.equal("tuser1");
	doc.content.should.equal("tcontent1");
	done();
      });
    });


    afterEach(function(done) {
      tmessage1.remove( function() {
	done();
      });
    });
  });

  describe('#find()', function() {
    var tmessage1 = new Message({userID:'tuser1', content:'tcontent1'});

    beforeEach(function(done) {
      tmessage1.save(function(err, doc) {
	done();
      });
    });


    it("対応する１件のメッセージを見つける", function(done) {
      Message.findOne({userID:'tuser1', content:'tcontent1'}).exec(function(err, doc) {
	doc.userID.should.equal("tuser1");
	doc.content.should.equal("tcontent1");
	done();
      });
    });

    afterEach(function(done) {
      tmessage1.remove( function() {
	done();
      });
    });
  });

});
       
"use strict";
var express = require('express')
  , http = require('http')
  , path = require('path')
  , io = require('socket.io')
  , connect = require("express/node_modules/connect")
  , app = module.exports = express()
  , server = http.createServer(app)
  , mongoModel = require('./models/mongoModel.js')
  , db = mongoModel.createConnection('mongodb://localhost:27017/test');

require('date-utils');

var User = db.model('User');
var Message = db.model('Message');

// メモリストアにセッションを保存（本番運用する場合にはRedisに変更する）
var sessionStore = new express.session.MemoryStore();

// 初期化処理 
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  
  //セッションの署名に使われるキー
  app.set('secretKey', 'skey');
  
  //cookieにexpressのsessionIDを保存する際のキー
  app.set('cookieSessionKey', 'sid');
  
  //POSTの値を受け取れるようにする
  app.use(express.bodyParser());
  
  //expressでセッション管理を行う
  app.use(express.cookieParser(app.get('secretKey')));
  app.use(express.session({
    key : app.get('cookieSessionKey'),
    store : sessionStore
  }));

  // views配下にjadeを配置する
  app.set('views', __dirname+'/views');
  app.set('view engine', 'jade');
  app.locals.pretty = true;
  app.use(express.static(__dirname+'/views'));

});

//ルート呼び出し 
app.get('/', function(req, res) {
  res.render('index');
});


//登録画面呼び出し
app.get('/signup', function(req, res) {
  res.render('signup');
});

//登録処理
app.post('/signup', function(req, res, next) {
  console.log('signup:'+req.body.user['userID']);
  
  var user = new User(req.body.user);
  user.save(function(err) {
    console.log(err);
    if (err) {
      res.render('signup', {errmsg: 'すでに登録済みです'});
    }
    else {
      res.render('chat');
    }
  });
});


//ログイン処理
app.post('/login', function(req, res, next) {
  console.log('login:'+req.body.user['userID']);

  User.findOne({userID:req.body.user['userID'], password:req.body.user['password']}, function(err, user) {
    if (err || user==null) {
      res.render('index', {errmsg: '認証に失敗しました'});
    }
    else {
      req.session.userID = user['userID'];
      console.log('*** login OK ***'+user['userID']);
      res.render('chat');
    }
  });
});




//ログアウト処理
app.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    if(err){
      console.log(err);
    }
    res.redirect('/');
  });
});

//チャットページ
app.get('/chat', function(req, res) {
  //セッションにuserIDがあったらログイン済みとする
  if ( typeof req.session.userID !== 'undefined' && req.session.userID) {
    console.log("session.userID:"+req.session.userID);
    res.render('/chat');
  }
  else {
    res.redirect('/');
  }
});

io = io.listen(server);
server.listen(app.get('port'), function() {
  console.log("Express server & socket.io listening on port " + app.get('port'));
});



// socket.ioの設定をする
io.configure(function() {
  //socket.ioのコネクション認証時にexpressのセッションIDを元にログイン済みか確認する
  io.set('authorization', function(handshakeData, callback) {
    if (handshakeData.headers.cookie) {
      //cookieを取得
      var cookie = require('cookie').parse(decodeURIComponent(handshakeData.headers.cookie));
      cookie = connect.utils.parseSignedCookies(cookie, app.get('secretKey'));
      var sessionID = cookie[app.get('cookieSessionKey')];
      
      // セッションを取得
      sessionStore.get(sessionID, function(err, session) {
	if (err) {
          console.log('cannot get session!');
          //セッションが取得できなかったら
          console.dir(err);
          callback(err.message, false);
	}
	else if (!session) {
          console.log('session not found');
          callback('session not found', false);
	}
	else {
          console.log("authorization success");
	  
          // socket.ioからもセッションを参照できるようにする
          handshakeData.cookie = cookie;
          handshakeData.sessionID = sessionID;
          handshakeData.sessionStore = sessionStore;
          handshakeData.session = new express.session.Session(handshakeData, session);
	  
          callback(null, true);
	}
      });
    }
    else {
      //cookieが見つからなかった時
      callback('cookie not found', false);
    }
  });
});

// コネクション接続時のイベント処理
io.sockets.on('connection', function(socket) {
  var handshake = socket.handshake;
  
  // Expressのセッションをsocket.ioから参照する
  console.log('session data', handshake.session);

  // 既存のメッセージを最新５件分取得する
  Message.find().sort('-created_at').limit(5).exec(function(err, msgs) {
    msgs = msgs.reverse();
    for(var i=0, size=msgs.length; i<size; i++) {
      socket.emit("message", msgs[i].userID, msgs[i].content, msgs[i].created_at.toFormat('YYYY/MM/DD HH24:MI:SS'));
    }
  });
  
  // メッセージを受信したら接続先に送信する
  socket.on("chat", function(msgContent) {
    var msg = new Message();
    msg.userID = handshake.session.userID;
    msg.content = msgContent;
    msg.save(function(err, msg) {
      if (err) {
	console.log(err);
	throw new Error(err);
      }
      else {
	// すべて（自分を含む全員）にメッセージを送る
	io.sockets.emit("message", msg.userID, msg.content, msg.created_at.toFormat('YYYY/MM/DD HH24:MI:SS'));
      }
    });
  });
  
  //１分ごとにセッションを更新する
  var intervalID = setInterval(function() {
    handshake.session.reload(function() {
      handshake.session.touch().save();
    });
  }, 60 * 1000);

  // disconnectを受け付けるとセッションの更新を停止する
  socket.on("disconnect", function(message) {
    console.log('sessionID:', handshake.sessionID, ' disconnected');
    clearInterval(intervalID);
  });
});


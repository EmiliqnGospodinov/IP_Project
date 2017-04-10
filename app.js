var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.set('view engine', 'ejs');
var sessions = require('client-sessions');
app.use('/client', express.static(__dirname + '/client'));
var serv = require('http').Server(app);
app.use(sessions({cookieName:'session',
                 secret:'secsession',
                 duration:24*60*60*1000,
                 activeDuration:5*60*1000
                })
);

// db
var mongojs = require('mongojs');
var db = mongojs('mongodb://decisioner:emo123456@ds117199.mlab.com:17199/shooterzdb', ['account','progress']);


var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.post('/login', urlencodedParser, function (req, res) {
  findUser(req.body, function(){
    req.session.username = req.body.username;
    res.render('index', {username: req.session.username});
  }, function(){
    res.redirect('/');
  });
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client/login.html');
});
app.get('/game', function(req, res){
  if(req.session.username === ''){
    res.setHeader('Username', req.session.username);
    res.redirect('/');
  }else{
    res.sendFile(__dirname + '/client/index.html');
  }
});
serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var SOCKET_LIST = {};
var Entity = function(){
  var self = {
    x:Math.random() * (870 - 60) + 60,
    y:Math.random() * (720 - 60) + 60,
    spdX:0,
    spdY:0,
    id:"",
  }
  self.update = function(){
      self.updatePosition();
  }
  self.updatePosition = function(){
    self.x += self.spdX;
    self.y += self.spdY;
  }
  self.getDistance = function(pt){
    return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
  }

  return self;
}

var Player = function(id, username){
  var self = Entity();
  self.id = id;
  self.username = username;
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.maxSpd = 10;

  var super_update = self.update;
  self.update = function(){
    self.shootDelay++;
    self.updateSpd();
    super_update();
  }

  self.updateSpd = function(){
    if(self.pressingRight && self.x < 900)
      self.spdX = self.maxSpd;
    else if(self.pressingLeft && self.x > 30)
      self.spdX = -self.maxSpd;
    else
      self.spdX = 0;
    if(self.pressingUp && self.y > 30)
      self.spdY = -self.maxSpd;
    else if(self.pressingDown && self.y < 750)
      self.spdY = self.maxSpd;
    else
      self.spdY = 0;
  }

  self.getInitPack = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
      username:self.username,
    };
  }
  self.getUpdatePack = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
    };
  }

  Player.list[id] = self;
  initPack.player.push(self.getInitPack());
  return self;
}
Player.list = {};
Player.onConnect = function(socket, username){
  var player = Player(socket.id, username);
  socket.on('keyPress',function(data){
    if(data.inputId === 'left')
      player.pressingLeft = data.state;
    else if(data.inputId === 'right')
      player.pressingRight = data.state;
    else if(data.inputId === 'up')
      player.pressingUp = data.state;
    else if(data.inputId === 'down')
      player.pressingDown = data.state;
  });
  socket.emit('init',{
    player:Player.getAllInitPack(),
  })
}
Player.getAllInitPack = function(){
  var players = [];
  for(var i in Player.list){
    players.push(Player.list[i].getInitPack());
  }
  return players;
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}
Player.update = function(){
  var pack = [];
  for(var i in Player.list){
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePack());
  }
  return pack;
}
//Login checks

var findUser = function(data, cb, loginError){
    db.account.find({username:data.username,password:data.password},function(err,res){
        if(res.length > 0)
            cb();
        else
            loginError();
    });
}
var isUsernameTaken = function(data,cb){
    db.account.find({username:data.username},function(err,res){
        if(res.length > 0)
            cb(true);
        else
            cb(false);
    });
}
var addUser = function(data,cb){
    db.account.insert({username:data.username,password:data.password},function(err){
        cb();
    });
}
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
  socket.on('signIn',function(data){
    Player.onConnect(socket, data.username);
  });
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  socket.on('disconnect',function(){
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });
});

var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

setInterval(function(){
  var updatePack = {
    player:Player.update(),
  }
  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('player_id', socket.id);
    socket.emit('init', initPack);
    socket.emit('update', updatePack);
    socket.emit('remove', removePack);
  }
},1000/40);

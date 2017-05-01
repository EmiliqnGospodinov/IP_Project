var socket = io();

var metaTag = document.getElementsByTagName("meta")[0];
socket.emit("signIn",{
  username: metaTag.getAttribute("content")
});
metaTag.parentNode.removeChild(metaTag);


//var register = document.getElementById('RegisterDiv');
//var openRegFormButton = document.getElementById('openRegForm');
//openRegFormButton.onclick = function(){
//  register.style.display = 'block;';
//}
//game
var playerx,playery;
const ctx = document.getElementById("ctx").getContext("2d");

//init
var Player = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.username = initPack.username;
  self.x = initPack.x;
  self.y = initPack.y;
  self.hp = initPack.hp;
  self.hpMax = initPack.hpMax;
  self.score = initPack.score;

  ctx.font = '10px Arial';
  var cradius = 30;

  self.draw = function(){
    ctx.fillText(self.username,self.x - cradius,self.y -51);// name
    var hpWidth = 100 * self.hp/ 10;
    ctx.fillStyle = 'red';
    ctx.fillRect(self.x - hpWidth / 2, self.y - 40, hpWidth, 4);// HP bar
    ctx.fillStyle = 'black';
    ctx.fillText("HP ",self.x - cradius,self.y - 35);// HP text
    ctx.fillText("Score: " + self.score,self.x - cradius,self.y - 43);// score
    ctx.beginPath();
    ctx.arc(self.x,self.y,cradius,0,2*Math.PI);// circle(x,y, radius, cut(whole circle))
    ctx.stroke();
    playerx = self.x;
    playery = self.y;
  }

  Player.list[self.id] = self;
  return self;
}
Player.list = {};

var Bullet = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.x = initPack.x;
  self.y = initPack.y;
  self.draw = function(){
    ctx.fillRect(self.x-5,self.y-5,5,5);//center the bullet
  }

  Bullet.list[self.id] = self;
  return self;
}
Bullet.list = {};

var currentPlayer;
socket.on('player_id', function(data){
  currentPlayer = data;
});
socket.on('init',function(data){
  //{ player : [{id:123,number:'1',x:0,y:0},{id:1,number:'2',x:0,y:0}], bullet: []}
  for(var i = 0 ; i < data.player.length; i++){
    new Player(data.player[i]);
  }
  for(var i = 0 ; i < data.bullet.length; i++){
    new Bullet(data.bullet[i]);
  }
});

socket.on('update',function(data){
  //{ player : [{id:123,x:0,y:0},{id:1,x:0,y:0}], bullet: []}
  for(var i = 0 ; i < data.player.length; i++){
    var pack = data.player[i];
    var p = Player.list[pack.id];
    if(p){
      if(pack.x !== undefined)
        p.x = pack.x;
      if(pack.y !== undefined)
        p.y = pack.y;
      if(pack.hp !== undefined)
        p.hp = pack.hp;
      if(pack.score !== undefined)
        p.score = pack.score;
    }
  }
  for(var i = 0 ; i < data.bullet.length; i++){
    var pack = data.bullet[i];
    var b = Bullet.list[data.bullet[i].id];
    if(b){
      if(pack.x !== undefined)
        b.x = pack.x;
      if(pack.y !== undefined)
        b.y = pack.y;
    }
  }
});

socket.on('remove',function(data){
  for(var i = 0; i < data.player.length; i++){
    delete Player.list[data.player[i]];
  }
  for(var i = 0; i < data.bullet.length; i++){
    delete Bullet.list[data.bullet[i]];
  }
})

setInterval(function(){
  ctx.clearRect(0,0,document.getElementById("ctx").width,document.getElementById("ctx").height);
  drawMap();
  for(var i in Player.list)
    Player.list[i].draw();
  for(var i in Bullet.list)
    Bullet.list[i].draw();
},25);

var drawMap = function(){
  var Img = {};
  Img.map = new Image();
  Img.map.src = '/client/img/Map.jpg';
  ctx.drawImage(Img.map,0,0);
}


document.onkeydown = function(event){
  if(event.keyCode === 68)    //d
    socket.emit('keyPress',{inputId:'right',state:true});
  else if(event.keyCode === 83)   //s
    socket.emit('keyPress',{inputId:'down',state:true});
  else if(event.keyCode === 65) //a
    socket.emit('keyPress',{inputId:'left',state:true});
  else if(event.keyCode === 87) // w
    socket.emit('keyPress',{inputId:'up',state:true});
}
document.onkeyup = function(event){
  if(event.keyCode === 68)    //d
    socket.emit('keyPress',{inputId:'right',state:false});
  else if(event.keyCode === 83)   //s
    socket.emit('keyPress',{inputId:'down',state:false});
  else if(event.keyCode === 65) //a
    socket.emit('keyPress',{inputId:'left',state:false});
  else if(event.keyCode === 87) // w
    socket.emit('keyPress',{inputId:'up',state:false});
}
document.onmousedown = function(event){
  socket.emit('keyPress',{inputId:'attack',state:true});
}
document.onmouseup = function(event){
  socket.emit('keyPress',{inputId:'attack',state:false});
}
document.onmousemove = function(event){
  var x = -Player.list[currentPlayer].x + event.clientX - 8;
  var y = -Player.list[currentPlayer].y + event.clientY - 8;
  var angle = Math.atan2(y,x) / Math.PI * 180;
  socket.emit('keyPress',{inputId:'mouseAngle',state:angle});
}

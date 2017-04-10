var socket = io();
var metaTag = document.getElementsByTagName("meta")[0];
socket.emit("signIn",{
  username: metaTag.getAttribute("content")
});
metaTag.parentNode.removeChild(metaTag);
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

  ctx.font = '10px Arial';
  var cradius = 30;

  self.draw = function(){
    ctx.fillText(self.username,self.x - cradius,self.y-35);// name
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



var currentPlayer;
socket.on('player_id', function(data){
  currentPlayer = data;
});
socket.on('init',function(data){
  //{ player : [{id:123,number:'1',x:0,y:0},{id:1,number:'2',x:0,y:0}]
  for(var i = 0 ; i < data.player.length; i++){
    new Player(data.player[i]);
  }
});

socket.on('update',function(data){
  //{ player : [{id:123,x:0,y:0},{id:1,x:0,y:0}]
  for(var i = 0 ; i < data.player.length; i++){
    var pack = data.player[i];
    var p = Player.list[pack.id];
    if(p){
      if(pack.x !== undefined)
        p.x = pack.x;
      if(pack.y !== undefined)
        p.y = pack.y;
    }
  }

});

socket.on('remove',function(data){
  for(var i = 0; i < data.player.length; i++){
    delete Player.list[data.player[i]];
  }
})

setInterval(function(){
  ctx.clearRect(0,0,document.getElementById("ctx").width,document.getElementById("ctx").height);
  for(var i in Player.list)
    Player.list[i].draw();
},25);



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

'use strict';
var _ = require('lodash');
var fs = require('fs');

var process = require("child_process");
var phantomhelper = require('../phantomhelper.js');
var spawn = process.spawn;
var execFile = process.execFile


var Variant = function (scenario, raw_variant_setting) {
  this.settings = raw_variant_setting;
  this.scenario = scenario;
  this.current_action_index = 0;
};


Variant.prototype.getSetting = function (key) {
  if (this.settings[key]) {
    return this.settings[key]
  }
  return this.scenario.getSetting(key)
};

Variant.prototype.setupPage = function (page) {
  this.scenario.setupPage(page);

  if (this.settings.page.viewportSize) {
    page.viewportSize = this.settings.page.viewportSize;
    page.clipRect = {left: 0, top: 0, width: page.viewportSize.width, height: page.viewportSize.height};

  }
  if (this.settings.page.userAgent) {
    page.settings.userAgent = this.settings.page.userAgent;
  }
};

Variant.prototype.film = function (page,callback) {
  var that = this;

  this.clean();
  this.setupPage(page);
  this.page = page;
  this.film_start = Date.now();
  this.current_action_index = -1;
  this.current_action = null;
  this.filmed_actions = [];

  //start capturing frames
  var fps = that.getSetting('fps');

  this.interval = setInterval(function () {
    var frame =  Math.floor(( Date.now() - that.film_start) * fps / 1000);
    if( that.frame == frame){
      return ;
    }
    that.frame = frame;
    page.render('frames/out' + (that.frame ) + '.png');
  }, fps / 2000);

  this.play(callback);
};

Variant.prototype.play = function(callback){

  var   that = this;

  this.nextAction();
  if(!this.current_action){
    console.log (' no more action, time to produce')
    this.stopFilm( function(){
      console.log(' film terminé')
      callback();
    });
    return;
  }
  console.log(this.current_action.label);
  this.current_action.start = Date.now()-this.current_action.variant.film_start;
  this.current_action.keyframe = this.frame;
  console.log(' this action key frame is ',this.current_action.keyframe)
  switch (this.current_action.type) {
    case 'open':
      console.log('open page');
      console.log(this.current_action.url);
      this.current_action.ready = Date.now()-this.current_action.variant.film_start;
      this.page.open(this.current_action.url, function(){
        that.play(callback);
      });
      break;
    case 'fill':
      console.log('fill field ', this.current_action.target);
      phantomhelper.fill(that.page,this.current_action,  function(){
        that.play(callback);
      });
      break;
    case 'click':
      phantomhelper.click(that.page,this.current_action,  function(){
        that.play(callback);
      });

      break;
  }
};

Variant.prototype.nextAction = function () {
  var that = this;
  this.current_action_index++;
  if (this.current_action) {
    this.current_action.end = Date.now()-this.current_action.variant.film_start;
    this.filmed_actions.push(this.current_action);
  }

  this.current_action = _.cloneDeep(this.scenario.getAction(this.current_action_index));
  if (!this.current_action) {
    return false;
  }

  _.each(this.current_action, function (value, key) {
    if (_.isString(value) && value.indexOf('##') === 0) { // a variable
      that.current_action[key] = that.getSetting(value.substr(2))
    }
  });
  this.current_action.variant = this;
  return this.current_action ;

};

Variant.prototype.stopFilm = function (cb) {

  clearInterval(this.interval);
  var path = "./output/" + this.getSetting('label');
  fs.makeDirectory(path);
  //handle missing frames
  //save the resulting script
  var json = [], that = this;
  _.each(this.filmed_actions, function (filmed_action) {
    json.push(_.omit(filmed_action, 'variant'));
    console.log(JSON.stringify(_.omit(filmed_action, 'variant')))
    var kf = filmed_action.keyframe ||0;
    console.log(' this action key frame is ',kf)
    fs.copy('frames/out' + (kf ) + '.png',path+'/out' + (kf ) + '.png');
  });
  fs.write(path+"/scenario.json", JSON.stringify(json), 'w');

  //mount images to film and save it in output folder

  this.fillHoles(function(){

    console.log('Convert video and output it to  ', "./output/" + that.getSetting('label') + ".mp4");
    that.produce(path,function () {

      console.log(' production done ');
      that.clean(function(){

        console.log(' cleaning done')
        cb();
      });
    })
  })




};


Variant.prototype.produce = function (path,cb) {
  var child = spawn(this.getSetting('ffmpeg_executable') || 'ffmpeg',
    ["-y",
      "-start_number", "10",
      "-framerate", this.getSetting('fps'),
      "-i", "frames/out%02d.png",
      "-c:v", "libx264",
      "-r", "25",
      "-pix_fmt", "yuv420p",
        path+"/video.mp4"
    ]);

  child.stdout.on("data", function (data) {
    console.log("spawnSTDOUT:", JSON.stringify(data))
  });

  child.stderr.on("data", function (data) {
    console.log("spawnSTDERR:", JSON.stringify(data))
  });

  child.on("exit", cb);
};

Variant.prototype.fillHoles= function(cb){
  var started = false,
    fifo =[],
    that = this;

  function process(){
    if(fifo.length){
      var args = fifo.shift();
      that.link(args.src,args.dest,process);
    }else{
      console.log('link done')
      cb();
    }
  }

  for (var i = 0; i < this.frame; i++) {
    if (fs.exists('frames/out' + (i) + '.png')) {
      if (!started) {
        console.log('started at ', i)
      }
      started = true;
    } else {
      if (started) {
        fifo.push({src:'frames/out' + (i - 1) + '.png', dest:'frames/out' + (i) + '.png'});
      }
    }
  }
  process();
};


Variant.prototype.link = function (src, dest, cb) {
  var callback = cb || function(){};

 //no symbolic link, since ffmepg seems to chokes on it
  execFile("cp",  [src, dest ], null, function (err, stdout, stderr) {
    callback();
  })
};

Variant.prototype.clean = function(cb){
  var list = fs.list('frames/');
  var callback = cb || function(){};

  for(var x = 0; x < list.length; x++){
    if(list[x] != "." && list[x] != ".."){
      fs.remove('frames/' + list[x])
    }
  }
  callback();
};

module.exports = Variant;

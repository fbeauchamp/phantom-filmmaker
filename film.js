var page = require('webpage').create();
var system = require('system');

var Scenario = require('./models/scenario.js');



var args = system.args;


var s = new Scenario('input/'+args[1]+'.json');

var vs = s.getVariants();

function moteur(){
  if(vs.length) {
    var v = vs.shift();
    console.log(' start filmining variant '+ v.getSetting('label'))
    v.film(page,function( ){
      moteur()
    } );
  }else{
    console.log(' FIN COMPLETE ')
    phantom.exit();
  }

}

moteur();
/*
_.each(vs, function(v){
  v.startFilm(page);

  nextAction(v);

});

setInterval(function () {
  page.render('example.png');
}, 500);*/
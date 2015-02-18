'use strict';
var _ = require('lodash');
var fs = require('fs');
var Variant = require('./variant.js');

var Scenario = function(path){
  this.scenario = JSON.parse( fs.open(path, "r").read());
};



Scenario.prototype.getVariants =function(){
  var variants = [],that = this;
  _.each(this.scenario.variants, function(variant_setting){
    variants.push(new Variant(that,variant_setting))
  });
  return variants;
};

Scenario.prototype.getSetting= function(key){
  return this.scenario.settings[key];
};

Scenario.prototype.getAction = function(pos){
  if(pos <0 || pos >= this.scenario.actions.length){
    return false;
  }
  return this.scenario.actions[pos]
};

Scenario.prototype.setupPage = function(page){

  if(this.scenario.settings.page.viewportSize){
    page.viewportSize =this.scenario.settings.page.viewportSize;
    page.clipRect = { left: 0, top: 0, width: page.viewportSize.width, height: page.viewportSize.height };

  }
  if(this.scenario.settings.page.settings.userAgent){
    page.settings.userAgent = this.scenario.settings.page.settings.userAgent;
  }
  _.each(this.scenario.page, function(value,key){
    if(_.isObject(value)){
      _.each(value,function(subvalue,subkey){
        page[key][subkey]=subvalue;
      })
    }else{
      page[key] =value;
    }
  });
};

module.exports=Scenario;


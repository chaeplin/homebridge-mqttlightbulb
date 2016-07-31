// MQTT Switch Accessory plugin for HomeBridge

'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");

function mqttlightbulbAccessory(log, config) {
  this.log          = log;
  this.name         = config["name"];
  this.url          = config["url"];
  this.client_Id    = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.options      = {
      keepalive: 10,
      clientId: this.client_Id,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
           topic: 'WillMsg',
           payload: 'Connection Closed abnormally..!',
           qos: 0,
           retain: false
      },
      username: config["username"],
      password: config["password"],
      rejectUnauthorized: false
  };
  this.caption            = config["caption"];
  this.topics             = config["topics"];
  this.payloadisjson      = config["payloadisjson"];
  this.payloadname        = config["payloadname"];
  this.payloadon          = config["payloadon"];
  this.payloadoff         = config["payloadoff"];
  this.on                 = false;
  this.control_brightness = false;
  this.control_hue        = false;
  this.control_saturation = false;
  this.brightness         = 0;
  this.hue                = 0;
  this.saturation         = 0;

  if (this.topics.setBrightness) {
    if (this.topics.setBrightness.length > 0) {
      this.control_brightness = true;
    }
  }
  if (this.topics.setHue) {
    if (this.topics.setHue.length > 0) {
      this.control_hue = true;
    }
  }
  if (this.topics.setSaturation) {
    if (this.topics.setSaturation.length > 0) {
      this.control_saturation = true;
    }
  }

  this.service = new Service.Lightbulb(this.name);
  this.service
    .getCharacteristic(Characteristic.On)
      .on('get', this.getStatus.bind(this))
      .on('set', this.setStatus.bind(this));
  if (this.control_brightness) {
    this.service
      .getCharacteristic(Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));
  }
  if (this.control_hue) {
    this.service
      .getCharacteristic(Characteristic.Hue)
        .on('get', this.getHue.bind(this))
        .on('set', this.setHue.bind(this));
  }
  if (this.control_saturation) {
    this.service
      .getCharacteristic(Characteristic.Saturation)
        .on('get', this.getSaturation.bind(this))
        .on('set', this.setSaturation.bind(this));
  }

  // connect to MQTT broker
  this.client = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.on('error', function (err) {
      that.log('Error event on MQTT:', err);
  });

  this.client.on('message', function (topic, message) {
    //console.log(that.payloadisjson);

    if (topic == that.topics.getOn) {
      if (that.payloadisjson == "false") {
        var status = message.toString();
        that.on = (status == "true" ? true : false);
        //console.log('recv msg nojson: ' + that.on + ' topic: ' + that.topics.getOn);
        that.service.getCharacteristic(Characteristic.On).setValue(that.on, undefined, 'fromSetValue');
      } else {
        var status = JSON.parse(message);
        that.on = (status[that.payloadname] == that.payloadon ? true : false);
        //console.log('recv msg json: ' + that.on + ' topic: ' + that.topics.getOn);
        that.service.getCharacteristic(Characteristic.On).setValue(that.on, undefined, 'fromSetValue'); 
      }
    }

    if (topic == that.topics.getBrightness && that.control_brightness) {
      var val = parseInt(message.toString());
      that.brightness = val;
      that.service.getCharacteristic(Characteristic.Brightness).setValue(that.brightness, undefined, 'fromSetValue');
    }

    if (topic == that.topics.getHue && that.control_hue) {
      var val = parseInt(message.toString());
      that.hue = val;
      that.service.getCharacteristic(Characteristic.Hue).setValue(that.hue, undefined, 'fromSetValue');
    }

    if (topic == that.topics.getSaturation && that.control_saturation) {
      var val = parseInt(message.toString());
      that.saturation = val;
      that.service.getCharacteristic(Characteristic.Brightness).setValue(that.saturation, undefined, 'fromSetValue');
    }
  });

  this.client.subscribe(this.topics.getOn);
  if (this.control_brightness) {
    this.client.subscribe(this.topics.getBrightness);
  }
  if (this.control_hue) {
    this.client.subscribe(this.topics.getHue);
  }
  if (this.control_saturation) {
    this.client.subscribe(this.topics.getSaturation);
  }
}

module.exports = function(homebridge) {
      Service = homebridge.hap.Service;
      Characteristic = homebridge.hap.Characteristic;
      homebridge.registerAccessory("homebridge-mqttlightbulb", "mqttlightbulb", mqttlightbulbAccessory);
}

mqttlightbulbAccessory.prototype.getStatus = function(callback) {
    callback(null, this.on);
}

mqttlightbulbAccessory.prototype.setStatus = function(status, callback, context) {
    if(context !== 'fromSetValue') {
      this.on = status;
      if (this.payloadisjson == "false") {
        //console.log('send msg nojson: ' + this.on + ' topic: ' + this.topics.setOn);
        this.client.publish(this.topics.setOn, status ? "true" : "false");
      } else {
        if (this.on) {
          //console.log('send msg: ' + this.on + ' topic: ' + this.topics.setOn);
          this.client.publish(this.topics.setOn, '{' + this.payloadname + ':' + this.payloadon + '}');
        } else {
          //console.log('send msg: ' + this.on + ' topic: ' + this.topics.setOn);
          this.client.publish(this.topics.setOn, '{' + this.payloadname + ':' + this.payloadoff + '}');
        }
      }
    }
    callback();
}

mqttlightbulbAccessory.prototype.getBrightness = function(callback) {
    callback(null, this.brightness);
}

mqttlightbulbAccessory.prototype.setBrightness = function(brightness, callback, context) {
    if(context !== 'fromSetValue') {
      this.brightness = brightness;
      this.client.publish(this.topics.setBrightness, this.brightness.toString());
    }
    callback();
}

mqttlightbulbAccessory.prototype.getHue = function(callback) {
    callback(null, this.hue);
}

mqttlightbulbAccessory.prototype.setHue = function(hue, callback, context) {
    if(context !== 'fromSetValue') {
      this.hue = hue;
      this.client.publish(this.topics.setHue, this.hue.toString());
    }
    callback();
}

mqttlightbulbAccessory.prototype.getSaturation = function(callback) {
    callback(null, this.saturation);
}

mqttlightbulbAccessory.prototype.setSaturation = function(saturation, callback, context) {
    if(context !== 'fromSetValue') {
      this.saturation = saturation;
      this.client.publish(this.topics.setSaturation, this.saturation.toString());
    }
    callback();
}

mqttlightbulbAccessory.prototype.getServices = function() {
  return [this.service];
}

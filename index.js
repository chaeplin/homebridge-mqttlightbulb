// MQTT Switch Accessory plugin for HomeBridge
//
// Remember to add accessory to config.json. Example:
// "accessories": [
//     {
//            "accessory": "mqttlightbulb",
//            "name": "PUT THE NAME OF YOUR SWITCH HERE",
//            "url": "PUT URL OF THE BROKER HERE",
//			  "username": "PUT USERNAME OF THE BROKER HERE",
//            "password": "PUT PASSWORD OF THE BROKER HERE"
// 			  "caption": "PUT THE LABEL OF YOUR SWITCH HERE",
// 			  "topics": {
// 				"statusGet": 	"PUT THE MQTT TOPIC FOR THE GETTING THE STATUS OF YOUR SWITCH HERE",
// 				"statusSet": 	"PUT THE MQTT TOPIC FOR THE SETTING THE STATUS OF YOUR SWITCH HERE"
// 			  }
//     }
// ],
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");


function mqttlightbulbAccessory(log, config) {
  	this.log          	= log;
  	this.name 		= config["name"];
  	this.url 		= config["url"];
	this.client_Id 		= 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.options = {
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
	this.caption = config["caption"];
        this.topics  = config["topics"];
	this.on = false;
        this.brightness = 0;
        this.hue = 0;
        this.saturation = 0;

	this.service = new Service.Lightbulb(this.name);
  	this.service
        .getCharacteristic(Characteristic.On)
    	.on('get', this.getStatus.bind(this))
    	.on('set', this.setStatus.bind(this));

	// connect to MQTT broker
	this.client = mqtt.connect(this.url, this.options);
	var that = this;
	this.client.on('error', function (err) {
		that.log('Error event on MQTT:', err);
	});

	this.client.on('message', function (topic, message) {
        // console.log(message.toString(), topic);

		if (topic == that.topics.getOn) {
			var status = message.toString();
			that.on = (status == "true" ? true : false);
		   	that.service.getCharacteristic(Characteristic.On).setValue(that.on, undefined, 'fromSetValue');
		}

        });
        this.client.subscribe(this.topics.getOn);
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
	  this.client.publish(this.topics.setOn, status ? "true" : "false");
	}
	callback();
}

mqttlightbulbAccessory.prototype.getServices = function() {
  return [this.service];
}

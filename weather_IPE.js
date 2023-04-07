var fs = require('fs');
var shortid = require('shortid');

global.resp_mqtt_ri_arr = [];
global.resp_mqtt_path_arr = {};
global.socket_q = {};

global.conf = require('./conf.js');

global.sh_state = 'crtae';
global.mqtt_client = null;


require('./get_data');
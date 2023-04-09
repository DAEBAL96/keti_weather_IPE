
var Onem2mClient = require('./onem2m_client');
var mqtt = require("mqtt");
const request = require('request');

let weather_ae = "keti_weather"
/* set device control conf */


/***************************/



var options = {
    protocol: conf.useprotocol,
    host: conf.cse.host,
    port: conf.cse.port,
    mqttport: conf.cse.mqttport,
    wsport: conf.cse.wsport,
    cseid: conf.cse.id,
    aei: conf.ae.id,
    aeport: conf.ae.port,
    bodytype: conf.ae.bodytype,
    usesecure: conf.usesecure,
};

var onem2m_client = new Onem2mClient(options);

function ae_response_action(status, res_body, callback) {
    var aeid = res_body['m2m:ae']['aei'];
    conf.ae.id = aeid;
    callback(status, aeid);
}

function create_cnt_all(count, callback) {
    if(conf.cnt.length == 0) {
        callback(2001, count);
    }
    else {
        if(conf.cnt.hasOwnProperty(count)) {
            var parent = conf.cnt[count].parent;
            console.log("create_cnt_all - parent : ",parent)
            var rn = conf.cnt[count].name;
            console.log("create_cnt_all - rn : ", rn)
            onem2m_client.create_cnt(parent, rn, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2001 || rsc == 4105) {
                    create_cnt_all(++count, function (status, count) { 
                        callback(status, count);
                    });
                }
                else {
                    callback(9999, count);
                }
            });
        }
        else {
            callback(2001, count);
        }
    }
}

function delete_sub_all(count, callback) {
    if(conf.sub.length == 0) {
        callback(2001, count);
    }
    else {
        if(conf.sub.hasOwnProperty(count)) {
            var target = conf.sub[count].parent + '/' + conf.sub[count].name;
            onem2m_client.delete_sub(target, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2002 || rsc == 2000 || rsc == 4105 || rsc == 4004) {
                    delete_sub_all(++count, function (status, count) {
                        callback(status, count);
                    });
                }
                else {
                    callback(9999, count);
                }
            });
        }
        else {
            callback(2001, count);
        }
    }
}

function create_sub_all(count, callback) {
    if(conf.sub.length == 0) {
        callback(2001, count);
    }
    else {
        if(conf.sub.hasOwnProperty(count)) {
            var parent = conf.sub[count].parent;
            var rn = conf.sub[count].name;
            var nu = conf.sub[count].nu;
            onem2m_client.create_sub(parent, rn, nu, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2001 || rsc == 4105) {
                    create_sub_all(++count, function (status, count) {
                        callback(status, count);
                    });
                }
                else {
                    callback('9999', count);
                }
            });
        }
        else {
            callback(2001, count);
        }
    }
}

setTimeout(setup_resources, 100, 'crtae');

function setup_resources(_status) {
    sh_state = _status;
    
    console.log('[status] : ' + _status);

    if (_status === 'crtae') {
        onem2m_client.create_ae(conf.ae.parent, conf.ae.name, conf.ae.appid, function (status, res_body) {
            console.log(res_body);
            if (status == 2001) {
                ae_response_action(status, res_body, function (status, aeid) {
                    console.log('x-m2m-rsc : ' + status + ' - ' + aeid + ' <----');
                    request_count = 0;

                    setTimeout(setup_resources, 100, 'rtvae');
                });
            }
            else if (status == 5106 || status == 4105) {
                console.log('x-m2m-rsc : ' + status + ' <----');

                setTimeout(setup_resources, 100, 'rtvae');
            }
            else {
                console.log('[???} create container error!  ', status + ' <----');
                // setTimeout(setup_resources, 3000, 'crtae');
            }
        });
    }
    else if (_status === 'rtvae') {
        onem2m_client.retrieve_ae(conf.ae.parent + '/' + conf.ae.name, function (status, res_body) {
            if (status == 2000) {
                var aeid = res_body['m2m:ae']['aei'];
                console.log('x-m2m-rsc : ' + status + ' - ' + aeid + ' <----');

                if(conf.ae.id != aeid && conf.ae.id != ('/'+aeid)) {
                    console.log('AE-ID created is ' + aeid + ' not equal to device AE-ID is ' + conf.ae.id);
                }
                else {
                    request_count = 0;
                    setTimeout(setup_resources, 100, 'crtct');
                }
            }
            else {
                console.log('x-m2m-rsc : ' + status + ' <----');
                // setTimeout(setup_resources, 3000, 'rtvae');
            }
        });
    }
    else if (_status === 'crtct') {
        create_cnt_all(request_count, function (status, count) {
            if(status == 9999) {
                console.log('[???} create container error!');
                // setTimeout(setup_resources, 3000, 'crtct');
            }
            else {
                request_count = ++count;
                if (conf.cnt.length <= count) {
                    console.log(conf.cnt, "conf.cnt list out line")
                    request_count = 0;
                    setTimeout(setup_resources, 100, 'delsub');
                }
            }
        });
    }
    else if (_status === 'delsub') {
        delete_sub_all(request_count, function (status, count) {
            if(status == 9999) {
                console.log('[???} create container error!');
                // setTimeout(setup_resources, 3000, 'delsub');
            }
            else {
                request_count = ++count;
                if (conf.sub.length <= count) {
                    request_count = 0;
                    setTimeout(setup_resources, 100, 'crtsub');
                }
            }
        });
    }
    else if (_status === 'crtsub') {
        create_sub_all(request_count, function (status, count) {
            if(status == 9999) {
                console.log('[???} create container error!');
                // setTimeout(setup_resources, 1000, 'crtsub');
            }
            else {
                request_count = ++count;
                if (conf.sub.length <= count) {
                    // thyme_tas.ready_for_tas();

                    setTimeout(setup_resources, 100, 'crtci');
                }
            }
        });
    }
    else if (_status === 'crtci') {
        if(conf.sim == 'enable') {
            var period = 1000; //ms
            var cnt_idx = 0;
            setTimeout(timer_upload, 1000, period, cnt_idx);
        }
    }
}

onem2m_client.on('notification', function (source_uri, cinObj) {

    console.log(source_uri, cinObj);

    var path_arr = source_uri.split('/')
    var event_cnt_name = path_arr[path_arr.length-2];
    var content = cinObj.con;

    if(event_cnt_name === 'co2') {
        // send to tas
        if (socket_arr[path_arr[path_arr.length-2]] != null) {
            socket_arr[path_arr[path_arr.length-2]].write(JSON.stringify(content) + '<EOF>');
        }
    }
});


//----------------------- mqtt module start ---------------------- //

//---------------------------------------------------------------- //

var t_count = 0;

function timer_upload_action(cnt_idx, content, period) {
    if (sh_state == 'crtci') {
        var parent = conf.cnt[cnt_idx].parent + '/' + conf.cnt[cnt_idx].name;
        onem2m_client.create_cin(parent, cnt_idx, content, this, function (status, res_body, to, socket) {
            console.log('x-m2m-rsc : ' + status + ' <----');
        });

        setTimeout(timer_upload, 0, period, cnt_idx);
    }
    else {
        setTimeout(timer_upload, 1000, period, cnt_idx);
    }
}

function timer_upload(period, cnt_idx) {
    var content = JSON.stringify({value: 'TAS' + t_count++});
    setTimeout(timer_upload_action, period, cnt_idx, content, period);
}


/*********************************** request conf **************************************/
/***************************************************************************************/
var url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
var queryParams = ""
// queryParams = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
// queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
// queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
// queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent('20230409'); /* */
// queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent('1000'); /* */
// queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
// queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */

function Hour_interval() {
    queryParams = ""
    let offset = 1000 * 60 * 60 * 9
    let now = new Date((new Date()).getTime() + offset)
    console.log("now : ", now)
    let nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    console.log("nexH : ", nextHour)
    let nowString = nextHour.toISOString();   // 만약 다시 펑션 돌아도 now가 키핑되면 now값을 불러와서 긁고
    nowString = nowString.replace(/T/g,'').replace(/-/g,'').replace(/:/g,'').substr(0, 12);
    let nowdate = nowString.substr(0, 8);
    let nowtime = nowString.substr(8, 2);

    if(Number(nowtime) === 0){  // 다음 달로 넘어가는 경우 now와 nextHour의 날짜 차이가 1이 아닐 경우 설정 달이 바뀔 때
        nowdate = String(Number(nowdate)-1)
        nowtime = "2300"
    }
    else if(Number(nowtime) !== 0){
        nowtime = (String(Number(nowtime)-1)+"00").padStart(4, '0')
    }
    
    console.log("req date = ",nowdate," time = ",nowtime)

    queryParams = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
    queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
    queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
    queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent(nowdate); /* */
    queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent(nowtime); /* */
    queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
    queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */

    let delay = nextHour - now;
    console.log("delay : ", delay)
    setTimeout(() => {          // 지정한 밀리 초 이후 코드 실행을 스케줄링 하는 데 사용 가능
        console.log(`Running function at ${nextHour}`);
        get_weather();
        Hour_interval();
    }, delay);
}

let get_weather = () => {       // oneM2M cin post =    
    request({
        url: url + queryParams,
        method: 'GET'
    }, function (error, response, body){
        body=JSON.parse(body)
        for(let i = 0; i < body["response"]["body"]["items"]["item"].length; i++){
            let data_category = body["response"]["body"]["items"]["item"][i]["category"]
            let data_value = body["response"]["body"]["items"]["item"][i]["obsrValue"]
            let raw_date = (body["response"]["body"]["items"]["item"][i]["baseDate"]+body["response"]["body"]["items"]["item"][i]["baseTime"]).substr(0, 10)
            let cin_obj = data_preprocessing(data_category, data_value, raw_date);
            let rn = null
            //  ["Precipitation","Temperature","Humidity","rainfall"]
            if(data_category === "PTY"){
                rn = "Precipitation"
            }
            else if(data_category === "REH"){
                rn = "Humidity"
            }
            else if(data_category === "RN1"){
                rn = "rainfall"
            }
            else if(data_category === "T1H"){
                rn = "Temperature"
            }
            var parent = "/Mobius/" + weather_ae + "/" + rn;
            onem2m_client.create_z2m_cin(parent, cin_obj, function(rsc, res_body){
                console.log("response code = ", rsc)
                console.log(res_body)
                console.log(rn, " cin upload complete")
            })
        }
    });
}

let date_convert = (input_date) => {   //input_date format yyyymmddhh
    let yy  = input_date.substr(0, 4)
    let mm  = input_date.substr(4, 2) 
    let dd  = input_date.substr(6, 2)
    let hh  = input_date.substr(8, 2)
    let out_date = `${yy}-${mm}-${dd} ${hh}:00:00`;
    return out_date
}

let data_preprocessing = (type, value, raw_date) => {
    let date = date_convert(raw_date)
    let state = null
    let cin_obj = {}

    if(type === "PTY"){
        if((value === "1")||(value === "2")||(value === "5")||(value === "6")){
            state = "rain"
        }
        else if((value === "3")||(value === "7")){
            state = "snow"
        }
        else if(value === "0"){
            state = "NoRain"
        }
    }  
    else if(type === "REH"){
        state = value
    }
    else if(type === "RN1"){
        state = value
    }
    else if(type === "T1H"){
        state = value
    }
    cin_obj["time_stamp"] = date
    cin_obj["state"] = state
    
    return cin_obj
}

// module.exports = get_weather();
module.exports = Hour_interval();

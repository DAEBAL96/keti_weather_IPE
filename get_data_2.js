
var Onem2mClient = require('./onem2m_client');
var mqtt = require("mqtt");
const request = require('request');
const moment = require('moment');

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
let make_limit_time = (input_time) => { //"yyyymmddhh"
    // moment.js를 사용하여 "yyyymmddhh" 형식의 문자열을 파싱
    let dateObj = moment(input_time, 'YYYYMMDDHH');

    // 27시간을 더한 새로운 날짜를 계산
    let newDateObj = dateObj.add(27, 'hours');

    // "yyyymmddhh" 형식의 문자열로 변환하여 출력
    let newDateStr = newDateObj.format('YYYYMMDDHH');
    
    return newDateStr
}

/*********************************** request conf **************************************/
/***************************************************************************************/
let realtime_url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
let forecast_url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
let air_url = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth';

let weather_query = ""
let air_query =""
// queryParams = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
// queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
// queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
// queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent('20230426'); /* */
// queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent('1400'); /* */
// queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
// queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */
// var cin_nowtime = "2023042615"
// let limit_time = make_limit_time(cin_nowtime)
function Hour_interval() {
    try{
        weather_query = ""
        air_query = ""
        let offset = 1000 * 60 * 60 * 9
        let now = new Date((new Date()).getTime() + offset)  // 현재 시간
        console.log("now : ", now)
        let nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0); // 1시간 뒤
        console.log("nexH : ", nextHour)
        let nowString = nextHour.toISOString();   // 만약 다시 펑션 돌아도 now가 키핑되면 now값을 불러와서 긁고
        nowString = nowString.replace(/T/g,'').replace(/-/g,'').replace(/:/g,'').substr(0, 12); // query로 yyyymmddhhmm 이 들어가므로 12자리
        let nowdate = nowString.substr(0, 8);
        let nowtime = nowString.substr(8, 2);   // 최종적으로 nextHour 값을 query에 넣게되는건데 setTimeout이 도는 시간이
                                                // nextHour를 측정한 시간으로부터 1시간 뒤므로 get data할 때는 그 시간이 now시간인 것
        let cin_nowtime = nowString.substr(0, 10);
        let limit_time = make_limit_time(cin_nowtime)
        let fsct_check_time = nowString.substr(8, 2);
        if(Number(nowtime) === 0){  // 다음 달로 넘어가는 경우 now와 nextHour의 날짜 차이가 1이 아닐 경우 설정 달이 바뀔 때 또한 적용 필요
            nowdate = String(Number(nowdate)-1) // 현재는 다음 날로 넘어가는 경우의 처리밖에 존재하지 않는다.
            nowtime = "2300"                // nowtime을 진짜 현재시간으로 query에 넣어서 데이터 요청하게되면
                                            // 초단기 실황은 API를 측정한 시간으로부터 40분 뒤부터하기 때문에 error 발생
                                            // 이에 함수는 11시에 돌지만 query에 basetime으로는 10시껄 넣어서 측정 날씨라서
                                            // 크게 오차없을거니깐 cin 및 data log로는 펑션이 도는 현재시간을 남기지만 측정 base time은 1시간 전을 넣어주는 것
        }
        else if(Number(nowtime) !== 0){
            nowtime = (String(Number(nowtime)-1)+"00").padStart(4, '0')
        }
        
        console.log("req date = ",nowdate," time = ",nowtime)
        // 이 때 설정한 nowdate, noewtime이 delay가 지난 후 setTimeout에 의해 get_realtime_weather의 query data로 들어가니깐
        // 1시간 뒤에 동작하는 request에는 nowdate, nowtime이 request 동작 기준 1시간 전의 데이터로 request가 날아가는 것
        // 실시간 데이터는 해당 시간 40분 부터 data 제공하기에 (ex. 10시40분 이후부터 10시의 데이터를 제공) 이러한 처리가 필요
        weather_query = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
        weather_query += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('400'); /* */
        weather_query += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
        weather_query += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent(nowdate); /* */
        weather_query += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent(nowtime); /* */
        weather_query += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
        weather_query += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */


        // air_query도 똑같다... 매일 05, 11, 17, 23시에 예보하지만 예보 후 15분 뒤 부터 api call back url에서 뿌리기 떄문에
        // 06, 12, 18 , 00에 1시간 전 api 넣어서 뿌리면 된다. 아니네 날짜만 넣어도 되네? 그럼 그냥 그날 6시에 돌리면 되겠구만~    
        air_query = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
        air_query += '&' + encodeURIComponent('returnType') + '=' + encodeURIComponent('json'); /* */
        air_query += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('500'); /* */
        air_query += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /* */
        air_query += '&' + encodeURIComponent('searchDate') + '=' + encodeURIComponent('2023-04-27'); /* */
        air_query += '&' + encodeURIComponent('informCode') + '=' + encodeURIComponent('PM10'); /* */
        



        let delay = nextHour - now;
        console.log("delay : ", delay)
        setTimeout(() => {          // 지정한 밀리 초 이후 코드 실행을 스케줄링 하는 데 사용 가능
            console.log(`Running function at ${nextHour}`);
            get_realtime_weather(weather_query, cin_nowtime);
            if((fsct_check_time==="03")||(fsct_check_time==="06")||(fsct_check_time==="09")||(fsct_check_time==="12")||(fsct_check_time==="15")||(fsct_check_time==="18")||(fsct_check_time==="21")||(fsct_check_time==="00")){
                get_forecast_weather(weather_query, cin_nowtime, limit_time);
            }
            Hour_interval();
        }, delay);
    } catch(err){
        console.log("Hour_interval - Error >> ", err)
    }
}

let make_query = (nowdate, nowtime) => {
    weather_query = ""
    weather_query = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
    weather_query += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
    weather_query += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
    weather_query += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent(nowdate); /* */
    weather_query += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent(nowtime); /* */
    weather_query += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
    weather_query += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */

    return weather_query
}

let get_realtime_weather = (weather_query, cin_nowtime) => {       // oneM2M cin post =    
    try{
        request({
            url: realtime_url + weather_query,
            method: 'GET'
        }, function (error, response, body){
            body=JSON.parse(body)
            for(let i = 0; i < body["response"]["body"]["items"]["item"].length; i++){
                let data_category = body["response"]["body"]["items"]["item"][i]["category"]
                let data_value = body["response"]["body"]["items"]["item"][i]["obsrValue"]
                // let raw_date = (body["response"]["body"]["items"]["item"][i]["baseDate"]+body["response"]["body"]["items"]["item"][i]["baseTime"]).substr(0, 10)
                let raw_date = cin_nowtime
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
                if(rn !== null){
                    var parent = "/Mobius/" + weather_ae + "/" + rn;
                    onem2m_client.create_z2m_cin(parent, cin_obj, function(rsc, res_body){
                        console.log("response code = ", rsc)
                        console.log(res_body)
                        console.log(rn, " cin upload complete")
                    })
                }
            }
        });
    } catch(err){
        console.log("get_realtime_weather - Error >> ", err)
    }
}

let get_forecast_weather = (weather_query, cin_nowtime, limit_time) => {       // oneM2M cin post =    
    let forecast_data = {
        "Precipitation_forecast": {},
        "Humidity_forecast": {},
        "rainfall_forecast": {},
        "Temperature_forecast": {}
    }
    let forecast_cnt_list = Object.keys(forecast_data)
    try{
        request({
            url: forecast_url + weather_query,
            method: 'GET'
        }, function (error, response, body){
            body=JSON.parse(body)
            for(let i = 0; i < body["response"]["body"]["items"]["item"].length; i++){
                let data_category = body["response"]["body"]["items"]["item"][i]["category"]
                let data_value = body["response"]["body"]["items"]["item"][i]["fcstValue"]
                let raw_date = (body["response"]["body"]["items"]["item"][i]["fcstDate"]+body["response"]["body"]["items"]["item"][i]["fcstTime"]).substr(0, 10)
                if( (Number(cin_nowtime)<Number(raw_date)) && (Number(raw_date)<=Number(limit_time)) ){       // 어차피 cin_nowtime이 api 사용 가능한 3시간 주기마다 해당 함수가 시작되므로 ~보다 클 때는 필요없는 조건
                    raw_date = date_convert(raw_date)
                    // data_value 변경 작업도 필요
                    if(data_category === "PTY"){
                        if((data_value === "1")||(data_value === "2")||(data_value === "4")){
                            data_value = "rain"
                        }
                        else if(data_value === "3"){
                            data_value = "snow"
                        }
                        else if(data_value === "0"){
                            data_value = "NoRain"
                        }
                        forecast_data["Precipitation_forecast"][raw_date] = data_value
                    }
                    else if(data_category === "REH"){
                        forecast_data["Humidity_forecast"][raw_date] = data_value
                    }
                    else if(data_category === "PCP"){
                        console.log("PCP parsing")
                        if(data_value === '강수없음'){
                            data_value = "0"
                        }
                        forecast_data["rainfall_forecast"][raw_date] = data_value
                    }
                    else if(data_category === "TMP"){
                        forecast_data["Temperature_forecast"][raw_date] = data_value
                    }
                }
            }
            for(let i=0; i < forecast_cnt_list.length; i ++){
                console.log(forecast_cnt_list[i], " for문 실행")
                console.log(forecast_cnt_list[i], "obecjt 출력")
                console.log(forecast_data[forecast_cnt_list[i]])
                if(forecast_data[forecast_cnt_list[i]] != {}){
                    forecast_data[forecast_cnt_list[i]]["current_time"] = date_convert(cin_nowtime)
                    let rn = forecast_cnt_list[i];
                    let parent = "/Mobius/" + weather_ae + "/" + rn;
                    onem2m_client.create_z2m_cin(parent, forecast_data[forecast_cnt_list[i]], function(rsc, res_body){
                        // console.log(parent, " cin upload res :", res_body)
                    })
                }
            }
        });
    } catch(err){
        console.log("get_forecast_weather - Error >> ", err)
    }
}


let get_air_forecast = (air_query, cin_nowtime, limit_time) => {    // air_pollution은 nowtime 필요 없을 것 같은데.ㅣ.?

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

// module.exports = get_realtime_weather(weather_query, cin_nowtime);
// module.exports = get_forecast_weather(weather_query, cin_nowtime, limit_time)
module.exports = Hour_interval();

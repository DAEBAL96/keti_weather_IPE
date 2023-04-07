/* open api url = https://www.data.go.kr/data/15057210/openapi.do */

const request = require('request');
const fs = require('fs');

var url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
var queryParams = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent('20230406'); /* */
queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent('2300'); /* */
queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* */
queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* */

request({
    url: url + queryParams,
    method: 'GET'
}, function (error, response, body) {
    fs.writeFileSync("./초단기.json", body);
    body=JSON.parse(body)
    console.log("date")
    console.log((body["response"]["body"]["items"]["item"][0]["baseDate"]+body["response"]["body"]["items"]["item"][0]["baseTime"]).substr(0, 10))    
    for(let i = 0; i < body["response"]["body"]["items"]["item"].length; i++){
        if(body["response"]["body"]["items"]["item"][i]["category"] === "PTY"){
            console.log("~!")
            console.log(body["response"]["body"]["items"]["item"][i]["obsrValue"])
        }  
        else if(body["response"]["body"]["items"]["item"][i]["category"] === "REH"){
            console.log("~!1")
            console.log(body["response"]["body"]["items"]["item"][i]["obsrValue"])
        }
        else if(body["response"]["body"]["items"]["item"][i]["category"] === "RN1"){
            console.log("~!2")
            console.log(body["response"]["body"]["items"]["item"][i]["obsrValue"])
        }
        else if(body["response"]["body"]["items"]["item"][i]["category"] === "T1H"){
            console.log("~!3")
            console.log(body["response"]["body"]["items"]["item"][i]["obsrValue"])
        }
    }
    
});
const http = require('http');
const request = require('request');
const fs = require('fs');
const { stringify } = require('querystring');


let open_url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
var queryParams = '?' + encodeURIComponent('serviceKey') + '=W%2B5swTrRFZkh5iro7bK2%2F%2FkLeDmGw%2BRhqwQ3gGR73X0eBkL8yCH7Yz7Tf8RryPu6cQ2ngY0CQgbXurNryJtUVA%3D%3D'; /* Service Key*/
queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('999'); /* */
queryParams += '&' + encodeURIComponent('dataType') + '=' + encodeURIComponent('JSON'); /* */
queryParams += '&' + encodeURIComponent('base_date') + '=' + encodeURIComponent('20230406'); /* */
queryParams += '&' + encodeURIComponent('base_time') + '=' + encodeURIComponent('2000'); /* */
queryParams += '&' + encodeURIComponent('nx') + '=' + encodeURIComponent('63'); /* 야탑 3동 x 좌표값 */
queryParams += '&' + encodeURIComponent('ny') + '=' + encodeURIComponent('123'); /* 야탑 3동 y 좌표값 */


// function sendRequestOnNextHour() {
//   const now = new Date();
//   const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
//   const delay = nextHour - now;
//   setTimeout(() => {
//     console.log(`Sending GET request to ${targetUrl}`);
//     request.get(targetUrl, (error, response, body) => {
//       if (error) {
//         console.error(`Error occurred while sending GET request: ${error.message}`);
//       }
//     });
//     sendRequestOnNextHour();
//   }, delay);
// }

// 서버 시작
// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.end('Server is running\n');
// });

// const port = process.env.PORT || 3000;
// server.listen(port, () => {
//   console.log(`Server is listening on port ${port}`);
//   sendRequestOnNextHour();
// });



// ---------------------------------------------------------------------------------- // 

function runFunctionOnNextHour(func) {
    let offset = 1000 * 60 * 60 * 9
    let now = new Date((new Date()).getTime() + offset)
    console.log("now : ", now)
    let nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0); 
    console.log("nexH : ", nextHour)
    
    let nowString = nextHour.toISOString();   // 만약 다시 펑션 돌아도 now가 키핑되면 now값을 불러와서 긁고
    nowString = nowString.replace(/T/g,'').replace(/-/g,'').replace(/:/g,'').substr(0, 12);
    let nowdate = nowString.substr(0, 8);
    let nowtime = nowString.substr(8, 2);
    nowtime = "0000"
    if(Number(nowtime) === 0){  // 다음 달로 넘어가는 경우 now와 nextHour의 날짜 차이가 1이 아닐 경우 설정
        nowtime = "2300"
        console.log("test")
    }
    else{
        nowtime = nowString.substr(8, 4);
    }

    console.log(nowdate," / ", nowtime)     //getMonth = 0~11, getDate() 
    let delay = nextHour - now;
    console.log("delay : ", delay)
    setTimeout(() => {          // 지정한 밀리 초 이후 코드 실행을 스케줄링 하는 데 사용 가능
        console.log(`Running function at ${nextHour}`);
        func();
        runFunctionOnNextHour(func);
    }, delay);
}

let get_weather_hour = () => {
    request({
        url: open_url + queryParams,
        method: 'GET'
    }, function (error, response, body) {
        //console.log('Status', response.statusCode);
        //console.log('Headers', JSON.stringify(response.headers));
        //console.log('Reponse received', body);
        fs.writeFileSync("./초단기.json", body);
    });
}

runFunctionOnNextHour(get_weather_hour);

// // 서버 시작

// runFunctionOnNextHour((get_weather_hour) => {
//     console.log('Function is running');
// });


// const offset = 1000 * 60 * 60 * 9
// const now = new Date((new Date()).getTime() + offset)
// console.log(now)


// runFunctionOnNextHour(() => {
// console.log('Function is running');

// });

// function myFunction() {
// console.log('My function is running');
// }
// 네이버 검색 API 결과 출력 - local.js
// 유형에 맞는 위치 3곳 검색 자료

var request = require('request');

var client_id = '아이디';
var client_secret = '시크릿아이디';

function getLocalData(query) {
  return new Promise((resolve, reject) => {
     var api_url = 'https://openapi.naver.com/v1/search/local?query=' + encodeURI(query) + '&display=3&start=1&sort=random'; 
     var options = {
         url: api_url,
         headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
      };
     request.get(options, function (error, response, body) {
       if (error || response.statusCode != 200) {
          reject(error || {statusCode: response.statusCode});
       }
       resolve(body);
     });
  });
}

module.exports = getLocalData;

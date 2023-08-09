const request = require('request');

const client_id = '아이디';
const client_secret = '시크릿 아이디';

exports.getLinksFromBlog = async function(title) {
    var api_url = 'https://openapi.naver.com/v1/search/blog?query=' + encodeURI(title) + '&display=3&sort=sim';
    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };
    var result = await new Promise((resolve, reject) => {
        request.get(options, function (error, response, body) {
            if (error) {
                console.log('Error:', error);
                reject(new Error('API 요청 에러.'));
            }
            if (response.statusCode != 200) {
                console.log('Response Status:', response.statusCode);
                reject(new Error('API 요청 에러.'));
            }
            var data = JSON.parse(body);
            var links = data.items.map(item => item.link);
            resolve({title: title, links: links});
        });
    });
    return result;
};
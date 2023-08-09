const { Configuration, OpenAIApi } = require("openai");
const getLocalData  = require('./local'); // 유형에 맞는 위치 3가지

// ChatGPT API 키
const configuration = new Configuration({
  apiKey: 'api 키',
});
const openai = new OpenAIApi(configuration);

const fs = require('fs');
const axios = require('axios');
const https = require('https');
const blog = require('./blog.js');

// Express 기본 모듈 불러오기
var express = require('express')
  , http = require('http')
  , path = require('path');

// Express의 미들웨어 불러오기
var bodyParser = require('body-parser')

// Express 세션 불러오기
const session = require('express-session');

const app = express();
const port = 3000;

app.use(session({
  secret: 'devday',
  resave: false,
  saveUninitialized: true
}));


// body-parser를 사용하여 POST 데이터 파싱
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); 

let data = {} // 질문과 답변 데이터 객체
app.post('/process/questions', async (req, res) => {

  const question = req.body.question; // 질문
  const answer = req.body.answer; // 답변
 
  data[`질문 : ${question}`] = `답변 : ${answer}`;

  res.send('Question processed');
  
});

//GPT 프롬프트 텍스트 읽기
function readPromptText() {
  const filePath = path.join(__dirname, 'prompt', 'prompt.txt');
  const promptText = fs.readFileSync(filePath, 'utf8');
  return promptText;
  
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 달리를 통한 이미지 생성
async function genImg(promptText) {
  const data = {
    "model": "image-alpha-001",
    "prompt": promptText,
    "num_images": 1
  };

  const response = await axios.post('https://api.openai.com/v1/images/generations', data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 키'
    }
  });

  return response.data.data[0].url;
}

// 서버 내 이미지 저장
async function saveImg(url, filename) {
  const directoryPath = 'public/media';
  const filePath = path.join(directoryPath, filename);

  // 이미지 다운로드가 완료되면 resolve되는 Promise 반환
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(`public/media/${filename}`));  // 파일 경로 반환
      });
    }).on('error', (err) => {
      fs.unlink(filePath);  // 에러 발생시 파일 삭제
      reject(err.message);
    });
  });
}

//-----------------------------------------------------------------------------------

app.set('view engine', 'ejs');  // EJS 뷰 엔진 설정 /views 폴더

app.get('/process/result', (req, res) => {
  console.log("result 호출")
  res.render('loading'); //loading 화면 띄우기
});

//fetchResult GPT 관련 작업들을 처리함
app.get('/process/fetchResult', async (req, res) => {
  console.log('feachResult 호출 됨')
  
  console.log('-------------------------------')
  let gpt_question = JSON.stringify(data); //JSON으로 변환

  const promptText = readPromptText() + '\n' + gpt_question;
  console.log(promptText)

  const completion1 = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {role: "system", content: "You are a helpful assistant."},
      {role: "user", content: promptText},  // 질문1 GPT에게 보내기
    ],
  });
  
  let gptAnswer1 = completion1.data.choices[0].message.content;

  console.log("GPT-3 답변: ", gptAnswer1);

  // GPT 2번째 질문
  const completion2 = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {role: "system", content: "You are a helpful assistant."},
      {role: "user", content: promptText},
      {role: "assistant", content: gptAnswer1},  // GPT-3의 첫 번째 응답
      {role: "user", content: "너가 답변해준 타입에 맞는 부산에 위치한 관광지 3곳을 추천해줘 이름만 답변하면 돼 콤마로 구분하여 답해 예를 들어 광안리 해수욕장,부산 타워,동아대학교"},
    ],
  });
  
  let gptAnswer2 = completion2.data.choices[0].message.content; //타입에 대한 관광지 3곳 문자열 저장
  console.log(gptAnswer2)

  // 이미지 생성
  const [place1, place2, place3] = gptAnswer2.split(', '); // 각 변수에 이름 넣기
  const places = [place1, place2, place3];
  let imgPaths;

  try {
      imgPaths = await Promise.all(places.map(async (place) => {
      const imageUrl = await genImg(place);
      const imgPath = await saveImg(imageUrl, `${place}.jpg`); // saveImg 함수가 Promise를 반환하므로 await 키워드 사용
      return imgPath;
    }));

  } catch (error) {
    console.error(error);
  }

  req.session.imgPaths = imgPaths;
  req.session.result = gptAnswer1;

  //상태가 done일 때 loding에서 넘어감
  res.json({
    status: 'done',
    imgPaths: imgPaths, 
    result: gptAnswer1
  }); 

});

// Result 결과값 보여주기 ( 이미지 3개 보여주기 )
app.get('/showResult', (req, res) => {
  console.log('showResult 호출')
  const imgPaths = req.session.imgPaths;
  const result = req.session.result;

  
  res.render('result', { imgPaths: imgPaths, result: result });
});

//각 메뉴에 대한 이미지 3개 생성
app.post('/process/menu', async (req, res) => {
  try {
    let title_array = []; // 빈 배열 생성
    console.log('menu 출력');

    const imageName = req.body.imageName;
    const imageName_result = imageName.replace('.jpg', '');
    const parts = imageName_result.split('/');
    const result = parts[parts.length - 1];

    var place = result +' 관광지';
    var hotel = result + ' 숙소';
    var food = result + ' 맛집';

    let place_data_str = await getLocalData(place);
    let hotel_data_str = await getLocalData(hotel);
    let food_data_str = await getLocalData(food);

    let place_data = JSON.parse(place_data_str);
    let hotel_data = JSON.parse(hotel_data_str);
    let food_data = JSON.parse(food_data_str);

    let allData = [place_data, hotel_data, food_data];

    //copy_data에 복사
    let newData = await Promise.all(allData.map(async (data) => {
      let copy_data = { ...data };
      copy_data.items = await Promise.all(copy_data.items.map(async (item) => {
        let newItem = { ...item };
        let title = item.title.toString().replace(/<[^>]*>/g, '');
        newItem.title = title;
        title_array.push(title);

        let address = newItem.address.toString();  //주소 문자열 변환

        var url = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=' + encodeURIComponent(address);

        const headers = {
          'X-NCP-APIGW-API-KEY-ID': 'API 키',
          'X-NCP-APIGW-API-KEY': 'API 키'
        };

        //위도 경도를 통해서 지도 이미지 추출
        try {
          const response = await axios.get(url, { headers });

          const Lx = response.data.addresses[0].x;
          const Ly = response.data.addresses[0].y;
          const xNum = parseFloat(Lx); //위도
          const yNum = parseFloat(Ly); //경도

          const map_img_url = `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=300&h=300&markers=type:d|size:mid|pos:` + xNum.toString() +`%20` + yNum.toString() +`|viewSizeRatio:0.5`;

          const response_img = await axios({
            method: 'get',
            url: map_img_url,
            responseType: 'stream',
            headers
          });

          const filePath = path.join(__dirname, 'public/media', title + '.png');
          const writer = fs.createWriteStream(filePath);

          response_img.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', () => {
              console.log('저장 완료 ' + filePath);
              resolve();
            });

            writer.on('error', (error) => {
              console.error(error);
              reject('저장 에러.');
            });
          });
        } catch (error) {
          console.error(error);
          throw new Error('저장 에러.');
        }

        return newItem;
      }));
      return copy_data;
    }));

   // 블로그 검색 결과 3개씩 가져오기
   let blog_results = [];
    for (const title of title_array) {
      blog_results.push(await blog.getLinksFromBlog(title));
      await delay(1000); // 1초 동안 기다림
  }
  
    //결과를 menu.ejs로 render
    res.render('menu', { place_data: newData[0], hotel_data: newData[1], food_data: newData[2] , blog_results});
  } catch (err) {
    console.error(err);
    res.status(500).send('Unexpected error.');
  }
});

// public 폴더를 /public 경로로 정적 파일 서빙
app.use('/public', express.static('public'));


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

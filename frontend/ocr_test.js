const https = require('https');

const postData = new URLSearchParams({
  apikey: 'helloworld',
  language: 'eng',
  OCREngine: '1',
  url: 'https://i.imgur.com/8Q5Z5qA.png',
  filetype: 'PNG'
}).toString();

const options = {
  hostname: 'api.ocr.space',
  port: 443,
  path: '/parse/image',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();

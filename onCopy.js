const { clipboard } =  require('electron');
const axios =  require('axios');
const FormData = require('form-data');
const fs = require('fs');

function onCopy(url, credential = '123123'){
    if(!credential) return null
    let preContent = null;
    let currentContent = clipboard.read('public.file-url') || clipboard.readText();
    setInterval(async () => {
      currentContent = clipboard.read('public.file-url') || clipboard.readText();
      if(currentContent === preContent) return null;
      
      if(clipboard.read('public.file-url')){
        const form = new FormData();
        form.append('file', fs.createReadStream(currentContent.replace('file://','')));
        await axios.post(`${url}api/upload/${credential}`, form, {headers: form.getHeaders() })
        preContent = currentContent
      }else{
        let currentContent = clipboard.readText();
        await axios.post(`${url}api/text/${credential}`, {text: currentContent})
        preContent = currentContent
      }
    }, 1000);
}

module.exports = onCopy
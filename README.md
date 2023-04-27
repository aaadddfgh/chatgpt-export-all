# chatgpt-export-all
export all you chat on chatGPT to markdown into a zip file(can not set number of chats exported), can help you archive your all chats  
## CATION
1. Not tested on plus version  
2. May fail when chat missing  
## Usage:  
0. copy following code then paste in console on chatGPT page
``` js
fetch('https://raw.githubusercontent.com/aaadddfgh/chatgpt-export-all/publish/my-lib-umd.js').then(response => response.text()).then(text => eval(text))
```

1. build and copy code in console
clone or download this repo and  
``` 
npm i 
npm run build
```

open site and copy code in `dist/my-lib-umd.jd` to console  

2. download `export.js` in release  

download `export.js` and copy all then paste in console on chatGPT page  

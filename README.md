# 远程U盘

## 临时保存文件

### h5(node >= 18)

- cd client
- 修改服务端接口地址 .env.production
- npm i
- npm run build
- 修改一下nginx配置，代理到dist目录 或者 直接python3 -m http.server 8080


### server(node >= 18)

- cd service
- npm i
- npm run start

访问 http://localhost:8080
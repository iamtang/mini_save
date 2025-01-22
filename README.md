# 迷你保存(mini_save)

## 简介
实现跨端手机、window、mac剪切板共享，提高工作效率。

## 主要功能
- 共享剪切板
- 保存剪切板历史
- 跨端跨平台共享

## 自主编译
### 构建h5
- cd client
- npm i
- npm run build

### 构建应用（exe/dmg）
- npm i
- npm run package
- 产物在build-output目录

node >= 18

## 下载与安装
[安装包](https://github.com/iamtang/mini_save/releases/)

## 配置与使用
![setting](./setting.png)
1. 运行后打开【设置】
2. 服务端无需设置地址，只需要设置端口和口令即可
3. 客户端要设置服务端的地址，相同的端口与口令即可同步

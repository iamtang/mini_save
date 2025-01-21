const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');

const app = express();

// 设置正确的 views 路径
const viewsPath = path.join(__dirname, 'dist');

// 打印路径以调试
console.log(viewsPath);

// 配置 Nunjucks
nunjucks.configure(viewsPath, {
  autoescape: true,    // 自动转义 HTML 特殊字符
  express: app,        // 绑定 Express
  noCache: true        // 禁用缓存
});

// 设置 Express 渲染 .njk 文件
app.set('view engine', 'html');

// 路由示例
app.get('/', (req, res) => {
  const data = {
    title: 'Home Page',
    username: 'John Doe',
    age: 30,
  };
  res.render('index', data); // 渲染模板并传递数据
});

// 启动服务器
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
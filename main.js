const path = require("path");
const server = require('./server.js')
const PORT = 3000;
const MAX_TEXT_NUMBER = 20;
const MAX_FILE_NUMBER = 10;
const userDataPath = path.join(process.cwd(), "userData");

server({userDataPath, MAX_TEXT_NUMBER, MAX_FILE_NUMBER, PORT})
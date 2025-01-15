const os =  require('os');
// 创建托盘应用
let ip = null
const PORT = 3000;
// 获取本机 IP 地址
function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (let dev in interfaces) {
    for (let details of interfaces[dev]) {
      if (details.family === 'IPv4' && !details.internal) {
        if(details.address.includes('192.168')){
            return details.address;
        }
        ip = details.address
      }
      
    }
  }
}
console.log(getIPAddress() || ip)
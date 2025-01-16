// const path = require('path')
module.exports = {
    makers: [
      // {
      //   name: '@electron-forge/maker-squirrel',
      //   platforms: ['win32'],
      //   config: (arch) => ({
      //     name: '远程U盘setup',
      //     setupIcon: path.join(__dirname, 'logo.ico'),
      //     authors: 'JJ',
      //     description: '远程U盘',
      //   })
      // },
      // {
      //   name: '@electron-forge/maker-dmg',
      //   platforms: ['darwin'],
      //   config: (arch) => ({
      //     title: '远程U盘', // DMG 文件的标题
      //     icon: './logo.icns', // 必须是 .icns 文件
      //   })
      // }
    ],
    packagerConfig: {
        // asar: true, // or an object containing your asar options
        // extraResource: ['./icon.png'],
        // icon: './logo',
        // ignore: [
        //   /^\/?client($|\/)/
        // ],
    },
    publishers: [{
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'iamtang',
          name: 'mini_save'
        },
        prerelease: false,
        draft: true
      }
    }],
    
};
module.exports = {
    makers: [
      {
        name: '@electron-forge/maker-zip',
        platforms: ['darwin', 'linux'],
        config: {
          // the config can be an object
        }
      },
      {
        name: '@electron-forge/maker-dmg',
        config: (arch) => ({
          title: '远程U盘', // DMG 文件的标题
          icon: './logo.icns', // 必须是 .icns 文件
          // it can also be a function taking the currently built arch
          // as a parameter and returning a config object, e.g.
        })
      }
    ],
    packagerConfig: {
        asar: true, // or an object containing your asar options
        extraResource: ['./icon.png'],
        icon: './logo',
        ignore: [
            /\/client/
        ],
    },
};
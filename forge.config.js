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
          // it can also be a function taking the currently built arch
          // as a parameter and returning a config object, e.g.
        })
      }
    ],
    packagerConfig: {
        // asar: false // or an object containing your asar options
        extraResource: ['./icon.png'],
        icon: './logo',
        ignore: [
            /\/client/
        ],
    },
};
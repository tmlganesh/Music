const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add a dev server proxy to bypass CORS for the JioSaavn API
  if (config.devServer) {
    config.devServer.proxy = {
      '/api': {
        target: 'https://saavn.sumit.co',
        changeOrigin: true,
        secure: true,
        logLevel: 'debug',
        headers: {
          'Origin': 'https://saavn.sumit.co',
        },
      },
    };
  }

  return config;
};

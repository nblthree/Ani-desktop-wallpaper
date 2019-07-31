// Native
const fs = require('fs');
// Packages
const { ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const request = require('request');
const wallpaper = require('wallpaper');

const download = function(uri, filename, callback) {
  try {
    request.head(uri, function(err, res) {
      if (err) {
        console.error(err);
        setTimeout(() => {
          download(uri, filename, callback);
        }, 5000);
      } else {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri)
          .pipe(fs.createWriteStream(filename))
          .on('close', callback);
      }
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = app => {
  if (isDev) {
    const userDataPath = app.getPath('userData');
    app.setPath('userData', `${userDataPath} (development)`);
  }

  const store = new Store({ name: 'appData' });

  const defaultOptions = {
    rating: 's',
    tags: [],
    timeInterval: '15',
    runOnBoot: true
  };

  app.setLoginItemSettings({
    openAtLogin: { ...defaultOptions, ...(store.get('options') || {}) }
      .runOnBoot,
    path: app.getPath('exe')
  });

  let { timeInterval } = { ...defaultOptions, ...(store.get('options') || {}) };
  let { tags } = { ...defaultOptions, ...(store.get('options') || {}) };
  let { rating } = { ...defaultOptions, ...(store.get('options') || {}) };
  let timer = null;

  ipcMain.on('get-options', event => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    event.returnValue = options;
  });

  ipcMain.on('set-rating', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.rating = arg;
    rating = arg;
    clearTimeout(timer);
    new_wallpaper();
    store.set('options', options);
  });

  ipcMain.on('set-tags', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.tags = arg;
    tags = arg;
    clearTimeout(timer);
    new_wallpaper();
    store.set('options', options);
  });

  ipcMain.on('set-timeInterval', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.timeInterval = arg;
    timeInterval = arg;
    store.set('options', options);
  });

  ipcMain.on('set-runOnBoot', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.runOnBoot = arg;
    app.setLoginItemSettings({
      openAtLogin: arg,
      path: app.getPath('exe')
    });
    store.set('options', options);
  });

  const get_images_data = page => {
    return new Promise(resolve => {
      request(
        {
          url:
            'http://konachan.com/post.json?limit=100&page=' +
            page +
            '&tags=' +
            tags.join('+'),
          json: true
        },
        function(error, response, body) {
          if (!error && response.statusCode === 200) {
            const images_data = body.map(val => ({
              id: val.id,
              file_url: val.file_url,
              jpeg_url: val.jpeg_url,
              tags: val.tags,
              rating: val.rating
            }));
            resolve(images_data);
          }
        }
      );
    });
  };

  const download_new_wallpaper = (images_data, img = 0) => {
    return new Promise(resolve => {
      const filtered_images = images_data.filter(
        val => rating === 'u' || val.rating === rating
      );

      if (filtered_images.length === 0) {
        resolve('done');
      }

      const img_name =
        app.getPath('userData') +
        '/wallpaper.' +
        filtered_images[img].file_url.replace(/(.*)?\./, '');
      download(filtered_images[img].file_url, img_name, async () => {
        await wallpaper.set(img_name);
        if (filtered_images.length === img + 1) {
          resolve('done');
        } else {
          if (timeInterval === 'onBoot') return;
          timer = setTimeout(() => {
            resolve(download_new_wallpaper(images_data, img + 1));
          }, 1000 * 60 * (Number(timeInterval) || 15));
        }
      });
    });
  };

  const new_wallpaper = async (page = 1) => {
    const images_data = await get_images_data(page);
    await download_new_wallpaper(images_data);
    if (timeInterval === 'onBoot') return;
    setTimeout(() => {
      new_wallpaper(page + 1, tags);
    }, 1000 * 60 * (Number(timeInterval) || 15));
  };

  new_wallpaper();
};

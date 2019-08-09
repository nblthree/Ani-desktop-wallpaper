// Native
const fs = require('fs');
const { join } = require('path');
const { execFile } = require('child_process');
// Packages
const { ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const request = require('request');
const wallpaper = require('wallpaper');

const binary = join(__dirname, 'bin/TranslucentTB.exe');
const isWinOS = process.platform === 'win32';

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
    timeInterval: 15,
    runOnBoot: true,
    pause: false,
    loopOverLikeList: false
  };

  app.setLoginItemSettings({
    openAtLogin: { ...defaultOptions, ...(store.get('options') || {}) }
      .runOnBoot,
    path: app.getPath('exe')
  });

  let { timeInterval, tags, rating, pause } = {
    ...defaultOptions,
    ...(store.get('options') || {})
  };
  const timer = [];

  ipcMain.on('get-options', event => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    event.returnValue = options;
  });

  ipcMain.on('set-loopOverLikeList', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.loopOverLikeList = arg;
    store.set('options', options);
  });

  ipcMain.on('set-rating', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.rating = arg;
    rating = arg;
    store.set('options', options);

    new_wallpaper();
  });

  ipcMain.on('set-tags', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.tags = arg;
    tags = options.tags;
    store.set('options', options);

    new_wallpaper();
  });

  ipcMain.on('set-timeInterval', (event, arg) => {
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.timeInterval = Number(arg);
    timeInterval = options.timeInterval;
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

  const func = {
    like: () => {
      const likes = store.get('likes') || [];
      const illustration = store.get('illustration');
      if (likes.some(val => val.id === illustration.id)) return;
      likes.push(illustration);
      store.set('likes', likes);
    },
    pauseStart: () => {
      const options = { ...defaultOptions, ...(store.get('options') || {}) };
      options.pause = !options.pause;
      store.set('options', options);
      const tlength = timer.length;
      for (let i = 0; i < tlength; i++) {
        const t = timer.shift();
        clearTimeout(t);
      }

      if (!options.pause) {
        new_wallpaper();
      }
    }
  };

  ipcMain.on('set-pause', () => {
    func.pauseStart();
  });

  ipcMain.on('set-like', () => {
    func.like();
  });

  ipcMain.on('set-taskbarColor', (event, arg) => {
    if (isWinOS) {
      execFile(binary, ['--no-tray', '--transparent', '--tint', arg], err => {
        if (err) {
          console.error(err);
        } else {
          store.set('taskbarColor', arg);
        }
      });
    }
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
          if (!error && response.statusCode === 200 && body.map) {
            const images_data = body.map(val => ({
              id: val.id,
              file_url: val.file_url,
              jpeg_url: val.jpeg_url,
              tags: val.tags,
              rating: val.rating
            }));
            resolve(images_data);
          } else {
            resolve(false);
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
        resolve(images_data.length);
      }

      const pathname = `${app.getPath('userData')}/wallpaper_${
        filtered_images[img].id
      }.${filtered_images[img].file_url.replace(/(.*)?\./, '')}`;
      download(filtered_images[img].file_url, pathname, async () => {
        await wallpaper.set(pathname);

        const old_pathname = store.get('illustration').pathname;
        if (old_pathname && old_pathname !== pathname) {
          fs.stat(old_pathname, function(err) {
            if (err) {
              return console.error(err);
            }

            fs.unlink(old_pathname, function(err) {
              if (err) return console.log(err);
            });
          });
        }

        store.set('illustration', { ...filtered_images[img], pathname });
        if (filtered_images.length === img + 1) {
          resolve(images_data.length);
        } else {
          if (timeInterval === 0) return;
          const tlength = timer.length;
          for (let i = 0; i < tlength; i++) {
            const t = timer.shift();
            clearTimeout(t);
          }

          timer.push(
            setTimeout(() => {
              resolve(download_new_wallpaper(images_data, img + 1));
            }, 1000 * 60 * timeInterval)
          );
        }
      });
    });
  };

  const new_wallpaper = async (page = 1) => {
    const images_data = await get_images_data(page);
    if (!images_data) {
      new_wallpaper(page);
      return;
    }

    const reStart = await download_new_wallpaper(images_data);
    if (reStart === 0) {
      page = 0;
    }

    if (timeInterval === 0) return;
    const tlength = timer.length;
    for (let i = 0; i < tlength; i++) {
      const t = timer.shift();
      clearTimeout(t);
    }

    timer.push(
      setTimeout(() => {
        new_wallpaper(page + 1, tags);
      }, 1000 * 60 * timeInterval)
    );
  };

  if (!pause) {
    new_wallpaper();
  }

  const taskbarColor = store.get('taskbarColor');
  if (taskbarColor && isWinOS) {
    execFile(
      binary,
      ['--no-tray', '--transparent', '--tint', taskbarColor],
      err => {
        if (err) {
          console.error(err);
        }
      }
    );
  }

  return func;
};

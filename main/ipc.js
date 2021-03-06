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
const log = require('electron-log');

const move = require('./utils/move');

const binary = join(__dirname, 'bin/TranslucentTB.exe');
const isWinOS = process.platform === 'win32';

const exists = function(pathname) {
  return new Promise(resolve => {
    fs.stat(pathname, function(error) {
      if (error === null) {
        return resolve(true);
      }

      log.error(error);
      return resolve(false);
    });
  });
};

const download = function(uri, filename, callback) {
  try {
    request.head(uri, function(error, res) {
      if (error) {
        console.error(error);
        log.error(error);
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
    log.error(error);
  }
};

module.exports = async app => {
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
  let { timeInterval, tags, rating, pause, loopOverLikeList, runOnBoot } = {
    ...defaultOptions,
    ...(store.get('options') || {})
  };
  const timer = [];

  app.setLoginItemSettings({
    openAtLogin: runOnBoot,
    path: app.getPath('exe')
  });

  const likeListLooper = (list, index = 0) => {
    const tlength = timer.length;
    for (let i = 0; i < tlength; i++) {
      const t = timer.shift();
      clearTimeout(t);
    }

    if (timeInterval === 0 || list.length === 0) return;

    timer.push(
      setTimeout(async () => {
        if (fs.existsSync(list[index].pathname)) {
          try {
            await wallpaper.set(list[index].pathname);
          } catch (error) {
            log.error(error);
          }
        } else {
          let likes = store.get('likes') || [];
          const illustration = list[index];

          likes = likes.filter(val => val.id !== illustration.id);
          store.set('likes', likes);
        }

        index += 1;
        if (index === list.length) {
          index = 0;
        }

        likeListLooper(list, index);
      }, 1000 * 60 * timeInterval)
    );
  };

  ipcMain.handle('get-options', () => {
    return { ...defaultOptions, ...(store.get('options') || {}) };
  });

  ipcMain.on('set-loopOverLikeList', (event, arg) => {
    log.info(`set-loopOverLikeList: ${arg}`);
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.loopOverLikeList = arg;
    store.set('options', options);

    if (!options.pause) {
      if (arg) {
        const list = store.get('likes') || [];
        likeListLooper(list);
      } else {
        new_wallpaper();
      }
    }
  });

  ipcMain.on('set-rating', (event, arg) => {
    log.info(`set-rating: ${arg}`);
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.rating = arg;
    rating = arg;
    store.set('options', options);

    new_wallpaper();
  });

  ipcMain.on('set-tags', (event, arg) => {
    log.info(`set-tags: ${arg.join(',')}`);
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.tags = arg;
    tags = options.tags;
    store.set('options', options);

    new_wallpaper();
  });

  ipcMain.on('set-timeInterval', (event, arg) => {
    log.info(`set-timeInterval: ${arg}`);
    const options = { ...defaultOptions, ...(store.get('options') || {}) };
    options.timeInterval = Number(arg);
    timeInterval = options.timeInterval;
    store.set('options', options);
  });

  ipcMain.on('set-runOnBoot', (event, arg) => {
    log.info(`set-runOnBoot: ${arg}`);
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
      log.info(`Like-illustration: ${illustration.id}`);

      const arr = illustration.pathname.split('/');
      const index = arr.length - 1;

      let directoryPath = illustration.pathname.split('/');
      directoryPath[index] = 'likelist';
      directoryPath = directoryPath.join('/');
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
      }

      arr.splice(index, 0, 'likelist');
      const newPathname = arr.join('/');
      move(illustration.pathname, newPathname, error => {
        if (error) {
          console.error(error);
          log.error(error);
        }
      });

      illustration.pathname = newPathname;
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
        if (options.loopOverLikeList) {
          const list = store.get('likes') || [];
          likeListLooper(list);
        } else {
          new_wallpaper();
        }
      }

      log.info(`pause-start: ${options.pause}`);
    }
  };

  ipcMain.on('set-pause', () => {
    func.pauseStart();
  });

  ipcMain.on('set-like', () => {
    func.like();
  });

  ipcMain.on('set-taskbarColor', async (event, arg) => {
    if (isWinOS && exists(binary)) {
      log.info(`set-taskbarColor: ${arg}`);
      execFile(binary, ['--no-tray', '--transparent', '--tint', arg], error => {
        if (error) {
          console.error(error);
          log.error(error);
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
            log.error(error);
            log.info(body);
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
        try {
          await wallpaper.set(pathname);
        } catch (error) {
          log.error(error);
        }

        const old_pathname =
          store.get('illustration') && store.get('illustration').pathname;
        if (old_pathname && old_pathname !== pathname) {
          fs.stat(old_pathname, function(error) {
            if (error) {
              log.error(error);
              return console.error(error);
            }

            fs.unlink(old_pathname, function(error) {
              if (error) {
                log.error(error);
                return console.error(error);
              }
            });
          });
        }

        store.set('illustration', { ...filtered_images[img], pathname });
        if (filtered_images.length === img + 1) {
          resolve(images_data.length);
        } else {
          const tlength = timer.length;
          for (let i = 0; i < tlength; i++) {
            const t = timer.shift();
            clearTimeout(t);
          }

          if (timeInterval === 0) return;

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
    const tlength = timer.length;
    for (let i = 0; i < tlength; i++) {
      const t = timer.shift();
      clearTimeout(t);
    }

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

    timer.push(
      setTimeout(() => {
        new_wallpaper(page + 1, tags);
        log.info(`New page: ${page + 1}`);
      }, 1000 * 60 * timeInterval)
    );
  };

  if (!pause) {
    if (loopOverLikeList) {
      const list = store.get('likes') || [];
      likeListLooper(list);
    } else {
      new_wallpaper();
    }
  }

  const taskbarColor = store.get('taskbarColor');
  if (taskbarColor && isWinOS && (await exists(binary))) {
    execFile(
      binary,
      ['--no-tray', '--transparent', '--tint', taskbarColor],
      error => {
        if (error) {
          console.error(error);
          log.error(error);
        }
      }
    );
  }

  return func;
};

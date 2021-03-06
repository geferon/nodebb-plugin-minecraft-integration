// Avatars Model

import {
  async,
  db,
  request,
} from './nodebb'

import { getUuidFromName, } from './players'

import Config from './config'

export function clearOldAvatars (options, next) {
  db.sortedSetsRemoveRangeByScore(['mi:avatars'], 0, Date.now() - Config.getAvatarExpiry() * 1000, err => {
    if (err) console.log('clearOldAvatars error:', err)
    if (typeof next === 'function') next()
  })
}

export function refreshAvatar (data, next) {
  const name = data.name

  deleteAvatar(data, err => {
    getAvatar(name, (err, data) => {
      next(err, {base64: data.base})
    })
  })
}

export function deleteAvatar (data, next) {
  if (!data || !data.name) return next(new Error('deleteAvatar() no name passed.'))

  const name = data.name

  db.sortedSetRemove('mi:avatars', name)

  next()
}

export function resetAvatars (data, callback) {
  getAvatarList((err, avatarList) => {
    async.each(avatarList, (player, next) => {
      const key = `mi:avatar:${player}`

      db.delete(key)
      db.sortedSetRemove('mi:avatars', player)

      next()
    }, err => {
      callback(err)
    })
  })
}

export function setAvatar (data) {
}

export function getAvatarList (next) {
  db.getSortedSetRange('mi:avatars', 0, -1, (err, list) => {
    next(err, list ? list.sort() : [])
  })
}

// Get the avatar base64 from the database.
export function getAvatarBase (name, callback) {
  console.log(`getting avatar base of ${name}`)

  // Database keys used.
  const keyBase = `mi:avatar:${name}`
  const keySorted = 'mi:avatars'

  // Store a fetched avatar binary as base64 and update fetch time.
  function storeAvatar (avatar, next) {
    // Convert buffer to a base64.
    avatar = avatar.toString('base64')

    // Update the avatar fetch time.
    db.sortedSetAdd(keySorted, Date.now(), name)

    // Set base64.
    db.set(keyBase, avatar, err => next(err, avatar))
  }

  // Get fetch time.
  // If old or null, Fetch avatar and update fetch time.
  // If different, Set modified.
  async.parallel({
    base: async.apply(db.get, keyBase),
    modified: async.apply(db.sortedSetScore, keySorted, name),
  }, (err, results) => {
    if (err) return callback(err)

    let { base, modified } = results
    let buffer

    async.waterfall([
      next => {
        if (!base || !modified || Date.now() - modified > 1000 * 60 * 10) return fetchAvatar(name, next)
        next(null, false)
      },
      (_buffer, next) => {
        if (_buffer) {
          buffer = _buffer || new Buffer(base, 'base64')
          storeAvatar(buffer, next)
        } else {
          next(null, base)
        }
      },
      (_base, next) => {
        base = _base
        modified = modified ? new Date(modified).toUTCString() : new Date().toUTCString()
        next()
      }
    ], err => {
      callback(err, {
        buffer: new Buffer(base, 'base64'),
        base,
        modified,
      })
    })
  })
}

export function getPocketAvatarFullBase (name, callback) {
  // Database keys used.
  const keyBase = `mi:pocketavatar:${name}`
  const keySorted = 'mi:pocketavatars'

  async.parallel({
    base: async.apply(db.getObjectField, keyBase, 'full'),
    modified: async.apply(db.sortedSetScore, keySorted, name),
  }, (err, results) => {
    if (err) return callback(err)

    if (!results.base) {
      console.log(`Did not recieve a skin from a server for ${name}, using steve skin.`)
      results.base = Config.steve
    }

    callback(null, results)
  })
}

export function getPocketAvatarBase (name, callback) {
  // Database keys used.
  const keyBase = `mi:pocketavatar:${name}`
  const keySorted = 'mi:pocketavatars'

  async.parallel({
    base: async.apply(db.getObjectField, keyBase, 'avatar'),
    modified: async.apply(db.sortedSetScore, keySorted, name),
  }, (err, results) => {
    if (err) return callback(err)

    if (!results.avatar) {
      getPocketAvatarFullBase(name, (err, results) => {
        if (err || results.base === Config.steve) return callback(err, results)

        Config.pocket.transformAvatar(results.base, 64, (err, base) => {
          if (err) return callback(err)

          db.setObjectField(keyBase, 'avatar', base)

          callback(null, {base, modified: results.modified})
        })
      })
    } else {
      callback(null, results)
    }
  })
}

export function storePocketAvatar (name, base) {
  // Database keys used.
  const keyBase = `mi:pocketavatar:${name}`
  const keySorted = 'mi:pocketavatars'

  // Update the avatar fetch time.
  db.sortedSetAdd(keySorted, Date.now(), name)

  // Set base64.
  db.delete(keyBase, err => {
    if (err) return console.log(err)
    db.setObjectField(keyBase, 'full', base, err => {
      if (err) return console.log(err)
    })
  })
}

// Gets the avatar from the configured cdn.
function fetchAvatar (name, next) {
  console.log(`getting avatar of ${name}`)
  async.parallel({
    url: async.apply(Config.getAvatarUrl, {name}), // The full url for the avatar.
    id: async.apply(getUuidFromName, name) // We need this for cdns that use uuids.
  }, (err, payload) => {
    if (err) return next(err)

    const url = payload.url.replace('{uuid}', payload.id)

    console.log(`Fetching avatar from CDN: ${url}`)

    async.waterfall([
      async.apply(request, {url, encoding: null}),
      async.apply(transform)
    ], (err, avatar) => {
      if (err) {
        console.log(`Could not retrieve skin using the cdn: ${Config.settings.get('avatarCDN')}`)
        console.log(err)
        if (Config.settings.get('avatarCDN') === 'mojang') return next(null, Config.steveBuffer)
        console.log('Defaulting to Mojang skin.')
        console.log(`Fetching avatar from CDN: http://skins.minecraft.net/MinecraftSkins/${name}.png`)

        // Try Mojang
        async.waterfall([
          async.apply(request, {url: `http://skins.minecraft.net/MinecraftSkins/${name}.png`, encoding: null}),
          (response, body, next) => {
            if (response.statusCode !== 200) return next(new Error('Skin server is down.'))

            Config.cdns['mojang'].transform(body, 32, next)
          }
        ], (err, avatar) => {
          if (err) {
            console.log("Couldn't connect to Mojang skin server.")
            console.log(err)

            return next(null, Config.steveBuffer)
          } else {
            next(null, new Buffer(avatar))
          }
        })
      } else {
        next(null, new Buffer(avatar))
      }
    })
  })
}

function transform (response, body, next) {
  const cdn = Config.settings.get('avatarCDN')

  if (response.statusCode !== 200) return next(new Error('Skin server is down.'))

  if (Config.cdns[cdn] && Config.cdns[cdn].transform) {
    Config.cdns[cdn].transform(body, Config.settings.get('avatarVariables.size') || 32, next)
  } else {
    next(null, body)
  }
}

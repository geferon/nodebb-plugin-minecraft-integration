import { getChat } from '../chat'
import { getPlayersByUid } from '../players'

export function render (data, next) {
  let { sid, amount, uid } = data

  getChat(sid, amount || 15, (err, data) => {
    getPlayersByUid(uid, (err, players) => {
      data.user = {}

      if (players && players.length) {
        data.user.players = players
        data.user.hasplayers = true
      }

      next(null, data)
    })
  })
}

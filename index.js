const pull = require('pull-stream')
const debug = require('debug')('ssb-autoinvite')

exports.name = 'autoinvite'
exports.version = require('./package.json').version
exports.manifest = {}

exports.init = function (ssb, config) {
  let code = config && config.autoinvite
  if (!code) {
    debug('INFO: No autoinvite section in config')
    return {}
  }
  debug('INFO: found invite code')
  ssb.whoami( (err, feed) => {
    if (err) {
      debug('ERROR: whoami failed')
      return {}
    }
    let doAccept = true
    pull(
      ssb.createUserStream({
        id: feed.id,
        values: true,
        keys: false
      }),
      pull.asyncMap( (value, cb) => {
        const content = value.content
        if (content && content.type == 'pub') {
          doAccept = false
          return cb(true)
        }
        cb(null, value)
      }),
      pull.onEnd( err => {
        if (err) throw err
        if (!doAccept) {
          debug('INFO: Already knows about a pub')
          return
        }
        debug('INFO: calling invite.accept')
        ssb.invite.accept(code)
      })
    )
  })
  return {}
}


const pull = require('pull-stream')
const Log = require('./log')

exports.name = 'autoinvite'
exports.version = require('./package.json').version
exports.manifest = {}

exports.init = function (ssb, config) {
  const {error, warning, notice, info} = Log(ssb, exports.name)

  let code = config && config.autoinvite
  if (!code) {
    notice('No autoinvite section in config')
    return {}
  }
  info('found invite code')
  ssb.whoami( (err, feed) => {
    if (err) {
      error('whoami failed')
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
          info('Already knows about a pub')
          return
        }
        notice('calling invite.accept')
        ssb.invite.accept(code, (err, results) => {
          if (err) return debug('ERROR: ' + err.message)
          notice('invite accepted %o', results)
        })
      })
    )
  })
  return {}
}


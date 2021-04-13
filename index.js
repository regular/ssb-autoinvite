const pull = require('pull-stream')
const Log = require('./log')

exports.name = 'autoinvite'
exports.version = require('./package.json').version
exports.manifest = {
  useInviteCode: 'async'
}

exports.init = function (ssb, config) {
  const {error, warning, notice, info} = Log(ssb, exports.name)

  let code = config && config.autoinvite
  let auto = true
  if (code !== undefined && typeof code !== 'string') {
    auto = code.auto !== false
    code = code.code
  }
  if (code && !auto) {
    notice('will not auto-invite because autoinvite.auto is set to false')
  }

  if (auto) {
    useInviteCode(err=>{})
  }

  return {
    useInviteCode
  }
  
  function useInviteCode(cb) {
    if (!code) {
      const msg = 'No autoinvite section in config'
      notice(msg)
      return cb(null)
    }
    info('found invite code')
    ssb.whoami( (err, feed) => {
      if (err) {
        const msg = 'whoami failed'
        error(msg)
        return cb(new Error(msg))
      }
      let doAccept = true
      pull(
        ssb.createUserStream({
          id: feed.id,
          values: true,
          keys: false,
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
          if (err) return cb(err)
          if (!doAccept) {
            info('Already knows about a pub')
            return cb(null)
          }
          notice('calling invite.accept')
          ssb.invite.accept(code, (err, results) => {
            if (err) {
              error('invite.accept failed:' + err.message)
              return cb(err)
            }
            notice('invite accepted %o', results)
            cb(null)
          })
        })
      )
    })
  }
}


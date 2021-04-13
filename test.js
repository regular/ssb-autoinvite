const test = require('tape')
const crypto = require('crypto')
const pull = require('pull-stream')
const ssbKeys = require('ssb-keys')
const CreateSbot = require('tre-bot')
const rimraf = require('rimraf')

const lucyKeys = ssbKeys.generate()

function testbot(config, cb) {
  CreateSbot().use(require('.'))(Object.assign({
    caps: {
      shs: crypto.randomBytes(32)
    },
    temp: !config.path 
  }, config), lucyKeys, cb)
}

test('do nothing if no autofoinvite is specified', t => {
  testbot({}, (err, myTestSbot) =>{
    t.error(err)
    setTimeout(() => {
      pull(
        myTestSbot.createLogStream({}),
        pull.collect((err, msgs) => {
          t.error(err)
          t.equals(msgs.length, 0, 'no message')
          myTestSbot.close( () => t.end() )
        })
      )
    }, 300)
  })
})

test('Call invite.accept if a code was specified', t => {
  testbot({
    autoinvite: 'code'
  }, (err, myTestSbot) =>{
    t.error(err)
    myTestSbot.invite = {
      accept: (code, cb) => {
        t.equal(code, 'code')
        cb(null, {blah: true})
        t.pass()
        myTestSbot.close( ()=> t.end() )
      }
    }
  })
})

test("don't call invite.accept on startup if auto==false", t => {
  let startup = true
  testbot({
    autoinvite: {
      code: 'code',
      auto: false
    }
  }, (err, myTestSbot) => {
    t.error(err)
    myTestSbot.invite = {
      accept: (code, cb) => {
        if (startup) {
          t.fail('accept() was called during startup when it shouldnt')
        } else {
          t.pass('accept() was called')
          t.equal(code, 'code')
          cb(null)
        }
      }
    }

    setTimeout( ()=>{
      pull(
        myTestSbot.createLogStream({}),
        pull.collect((err, msgs) => {
          t.error(err);
          t.equals(msgs.length, 0, 'no message');
          startup = false
          myTestSbot.autoinvite.useInviteCode( err=>{
            t.error(err)
            myTestSbot.close( () => t.end() )
          })
        })
      )
    })
  })
})

test("don't call invite.accept if the user already knows about a pub", t => {
  const path = '/tmp/test_autoinvite_preexisting'
  rimraf.sync(path)

  function publish(cb) {
    testbot({path, host: 'localhost'}, (err, myTestSbot) =>{
      const lucy = myTestSbot.createFeed(lucyKeys)

      lucy.publish({
        type: 'pub'
      }, (err, msg) => {
        if (err) throw err
        myTestSbot.close(cb)
      }) 
    })
  }
      
  publish( err => {
    if (err) throw err

    testbot({
      path,
      autoinvite: 'code'
    }, (err, myTestSbot) => {
      t.error(err)
      myTestSbot.invite = {
        accept: ()=> {
          t.fail('accept() was called when it shouldnt')
        }
      }

      setTimeout( ()=>{
        pull(
          myTestSbot.createLogStream({}),
          pull.collect((err, msgs) => {
            t.error(err);
            t.equals(msgs.length, 1, 'one message');
            myTestSbot.close( () => t.end() )
          })
        )
      }, 300)
    })

  })
})


const test = require('tape')
const pull = require('pull-stream')
const ssbKeys = require('ssb-keys')
const {createSbot} = require('scuttlebot')
const rimraf = require('rimraf')

const lucyKeys = ssbKeys.generate()

test('do nothing if no autofoinvite is specified', t => {
  const myTestSbot = createSbot().use(require('.'))({
    temp: true,
    keys: lucyKeys
  })

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

test('Call invite.accept if a code was specified', t => {
  const myTestSbot = createSbot().use(require('.'))({
    temp: true,
    keys: lucyKeys,
    autoinvite: 'code'
  })
  myTestSbot.invite = {
    accept: (code, cb) => {
      t.equal(code, 'code')
      cb(null, {blah: true})
      t.pass()
      myTestSbot.close( ()=> t.end() )
    }
  }
})

test('dont call invite.accept if the user already knows about a pub', t => {
  const path = '/tmp/test_autoinvite_preexisting'
  rimraf.sync(path)

  function publish(cb) {
    const myTestSbot = createSbot()({
      path,
      keys: lucyKeys
    })
    const lucy = myTestSbot.createFeed(lucyKeys)

    lucy.publish({
      type: 'pub'
    }, (err, msg) => {
      if (err) throw err
      myTestSbot.close(cb)
    }) 
  }
      
  publish( err => {
    t.error(err)
    
    const myTestSbot = createSbot().use(require('.'))({
      path,
      keys: lucyKeys,
      autoinvite: 'code'
    })
    myTestSbot.invite = {
      accept: ()=> {
        t.fail()
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


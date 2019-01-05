ssb-autoinvite
==

This Scuttlebot plugin automatically uses an invite code specified in the config file
if the user does not know about any pub yet.

Install this as an sbot plugin and put

```
  autoinvite: 'the invite code'
```

into your sbot config.

The plugin will call invite.accept if the user never has published a message of type 'pub'.



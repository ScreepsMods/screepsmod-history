# screepsmod-history

## This is a history mod for the Screeps Private Server

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![CircleCI](https://circleci.com/gh/ScreepsMods/screepsmod-mongo/tree/master.svg?style=shield)](https://circleci.com/gh/ScreepsMods/screepsmod-mongo/tree/master)

[![NPM info](https://nodei.co/npm/screepsmod-history.png?downloads=true)](https://npmjs.org/package/screepsmod-history)

## Requirements

* nodejs 6+
* Plenty of disk space, I see an average of 8kb per tick per room, by default this saves 200,000 ticks. So ~20MB per active room.


## Configuration

All options and defaults are listed below

### History

* mode: file (valid values are `file` and `aws`)
* region: us-east-1
* apiVersion: latest
* accessKeyId: 
* secretAccessKey: 
* bucket: 


## Examples

Config can be applied in several ways:

### .screepsrc (Recommended)

Add to the bottom of your .screepsrc file
```
[history]
mode = 'aws'
region = 'us-east-1'
apiVersion = 'latest'
accessKeyId = 'my-aws-access-key-id'
secretAccessKey = 'my-aws-secret-access-key'
bucket = 'my-bucket'
```

### ENV Method

Please note that this method only works when launching modules directly, when launched via the default launcher they will be ignored.

```
HISTORY_MODE='aws'
```

# screepsmod-history

## This is a history mod for the Screeps Private Server

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![CircleCI](https://circleci.com/gh/ScreepsMods/screepsmod-mongo/tree/master.svg?style=shield)](https://circleci.com/gh/ScreepsMods/screepsmod-mongo/tree/master)

[![NPM info](https://nodei.co/npm/screepsmod-history.png?downloads=true)](https://npmjs.org/package/screepsmod-history)

## Requirements

* nodejs 10+
* Plenty of disk space, I see an average of 8kb per tick per room, by default this saves 200,000 ticks. So ~20MB per active room.

## Warning
Currently with AWS mode this produces a lot of PUT requests, this can easily become very expensive. 
For that reason, AWS mode is currently not recommended

## Configuration

All options and defaults are listed below

### History

* historyChunkSize: 20 (Number of ticks per history file)
* mode: sqlite (valid values are `file`, `aws`, and `sqlite`)
* region: us-east-1
* apiVersion: latest
* accessKeyId: 
* secretAccessKey: 
* bucket: 
* path: history


## Examples

Config can be applied in several ways:

### .screepsrc (Recommended)

Add to the bottom of your .screepsrc file
```
[history]
historyChunkSize = 20
mode = 'aws'
region = 'us-east-1'
apiVersion = 'latest'
accessKeyId = 'my-aws-access-key-id'
secretAccessKey = 'my-aws-secret-access-key'
bucket = 'my-bucket'
path = 'my-custom-path'
```

### ENV Method

Please note that this method only works when launching modules directly, when launched via the default launcher they will be ignored.

```
HISTORY_MODE='aws'
```

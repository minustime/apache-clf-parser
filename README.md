# Apache CLF Parser

This module parses Apache common log format files, counts number of times a resource has been accessed and produces a csv file with the stats.

## Usage

```
// install the module

$ npm install https://github.com/minustime/apache-clf-parser
```

```
// index.js

const parser = require('apache-clf-parser');

parser.parse({
  logs: 'logs',
  logExtension: 'log'
});
```

```
// run it

$ node index.js
```

## Options

An optional object can be passed to the `parse` function with the following properties.

| option       | default    | description                                                       |
| ------------ | ---------- | ----------------------------------------------------------------- |
| logs         | logs       | directory where logs files are located, can include gzipped files |
| logExtension | gz         | log file extension                                                |
| report       | report.csv | name of csv file to write report to                               |
| logSource    |            | string that gets prepended to each resource line in report file   |

## Report

Sample csv report:

```
Resource,Access Count
"https:/www.kennedyspacecenter.com/images/KSC-logosmall.gif",20
"https:/www.kennedyspacecenter.com/images/NASA-logosmall.gif",16
"https:/www.kennedyspacecenter.com/images/MOSAIC-logosmall.gif",15
"https:/www.kennedyspacecenter.com/images/ksclogo-medium.gif",14
"https:/www.kennedyspacecenter.com/images/USA-logosmall.gif",14
"https:/www.kennedyspacecenter.com/images/WORLD-logosmall.gif",14
"https:/www.kennedyspacecenter.com/",11
"https:/www.kennedyspacecenter.com/history/apollo/images/apollo-logo1.gif",10
```

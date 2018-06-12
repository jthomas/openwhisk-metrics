const log = require('./service/log')
const cpu = require('./metrics/cpu')
const time = require('./metrics/time')
const error = require('./metrics/error')
const memory = require('./metrics/memory')
const coldstart = require('./metrics/coldstart')
const util = require('./metrics/util')

const metrics = fn => {
  const before = collectors_to_run_before()
  const after = collectors_to_run_after()

  return async params => {
    before.forEach(([label, collector]) => collector(params))

    let result

    try {
      result = await fn(params)
    } catch (error) {
      result = { error }
    }

    const ts = timestamp()
    const data = util.flatten(after.map(
      ([label, collector]) => util.merge(metrics.label(label, metrics.config), collector(result), ts)
    ))

    await save_metrics(data)

    return result
  }
}

// converts metric name into fully qualified label
metrics.label = util.label

// default config
metrics.config = {};

// default metrics to collect
metrics.collect = {
  cpu: cpu(),
  time: time(),
  memory: memory(),
  error: error(),
  coldstart: coldstart()
}

// default metric service, saves to console out
metrics.service = log

const filter_collectors = test => Object.entries(metrics.collect).filter(test)

// find metrics that registered to run before wrapped function. 
// identified by objects with a `start` method.
const collectors_to_run_before = () => {
  return filter_collectors(([label, collector]) => typeof collector.start === 'function')
    .map(([label, collector]) => [label, collector.start])
}

// find metrics that registered to run after wrapped function. 
// identified by being a function or an object with an `end` method.
const collectors_to_run_after = () => {
  return filter_collectors(([label, collector]) => typeof collector === 'function' || typeof collector.end === 'function')
    .map(([label, collector]) => [label, collector.end || collector])
}

// UNIX timestamp i.e seconds since the UNIX epoch
const timestamp = () => Math.floor(new Date() / 1000)

const save_metrics = async data => {
  if (metrics.service && metrics.service.save) {
    try {
      await metrics.service.save(data)
    } catch (error) {
      // should log here...
      console.log(error)
    }
  }
}

module.exports = metrics

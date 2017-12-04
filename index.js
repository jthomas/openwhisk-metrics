// DEFAULT LOG SHOULD BE TO LOG SERVICE
//
const filter_collectors = test => Object.entries(metrics.collect).filter(test)

const collectors_to_run_before = () => {
  return filter_collectors(([label, collector]) => typeof collector.start === 'function')
    .map(([label, collector]) => [label, collector.start])
}

const collectors_to_run_after = () => {
  return filter_collectors(([label, collector]) => typeof collector === 'function' || typeof collector.end === 'function')
    .map(([label, collector]) => [label, collector.end || collector])
}

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
    const data = flatten(after.map(([label, collector]) => merge(metrics.label(label), collector(result), ts)))

    await save_metrics(data)

    return result
  }
}

metrics.label = label => {
  const ns = process.env['__OW_NAMESPACE'] || ''
  const id = process.env['__OW_ACTION_NAME'] || ''
  const name = id.substring(`/${ns}/`.length)
  const actv = process.env['__OW_ACTIVATION_ID'] || ''

  const escape = str => str.replace(/\./g, '_')
  return `${escape(ns)}.${escape(name)}.${actv}.${label}`
}

const flatten = arr => arr.reduce((a, b) => a.concat(b), [])

const merge = (label, value, ts) => {
  if (typeof value === 'number') {
    return [{ name: label, value, timestamp: ts}]
  // wtfjs: typeof null => 'object'
  } else if (value !== null && typeof value === 'object') {
    return flatten(Object.entries(value).map(([inner, innerValue]) =>
      merge(`${label}.${inner}`, innerValue, ts)
    ))
  }

  return []
}

metrics.collect = {
}

module.exports = metrics

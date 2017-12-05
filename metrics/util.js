// Convert metric name to full Grafana metric label
// e.g. label -> <namespace>.<action_id>.<activation>.label
const label = label => {
  const ns = process.env['__OW_NAMESPACE'] || ''
  const id = process.env['__OW_ACTION_NAME'] || ''
  const name = id.substring(`/${ns}/`.length)
  const actv = process.env['__OW_ACTIVATION_ID'] || ''

  // replace '.' chars with '_' as '.' is grafana label separator
  const escape = str => str.replace(/\./g, '_')
  return `${escape(ns)}.${escape(name)}.${actv}.${label}`
}

const flatten = arr => arr.reduce((a, b) => a.concat(b), [])

// Merge child object values into parent
const merge = (label, value, ts) => {
  if (typeof value === 'number') {
    return [ { name: label, value, timestamp: ts } ]
  // wtfjs: typeof null => 'object'
  } else if (value !== null && typeof value === 'object') {
    return flatten(Object.entries(value).map(([inner, innerValue]) =>
      merge(`${label}.${inner}`, innerValue, ts)
    ))
  }

  return []
}

module.exports = { label, merge, flatten }

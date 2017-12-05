import test from 'ava'
import sinon from 'sinon'
import log from '../service/log'

test('should log metric values that are saved', t => {
  const _log = console.log
  console.log = sinon.spy()

  const timestamp = (new Date()).getTime()
  const values = [
    { name: 'metric.name.label', value: 100.0, timestamp },
    { name: 'metric.name.multi.a', value: 100.0, timestamp },
    { name: 'metric.name.multi.b', value: 100.0, timestamp }
  ]
  log.save(values)

  t.true(console.log.calledThrice)
  values.forEach(value => t.true(console.log.calledWith(`METRIC ${value.name} ${value.value} ${value.timestamp}`)))

  console.log = _log
})

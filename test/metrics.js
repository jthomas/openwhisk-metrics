import test from 'ava'
import memory from '../metrics/memory'
import cpu from '../metrics/cpu'
import error from '../metrics/error'
import time from '../metrics/time'
import coldstart from '../metrics/coldstart'
import util from '../metrics/util'

test('memory metric should return process memory', t => {
  const processMemUsage = process.memoryUsage()
  const m = memory()

  t.deepEqual(Object.keys(m()), Object.keys(processMemUsage))
})

test('cpu metric should return elapsed cpu usage', t => {
  const start = process.cpuUsage()
  const usage = cpu()
  usage.start()

  // spin the CPU for 100 milliseconds
  const now = Date.now();
  while (Date.now() - now < 100);

  const end = process.cpuUsage(start)
  const data = usage.end()

  t.deepEqual(Object.keys(data), Object.keys(end))

  Object.entries(data).forEach(([key, value]) => {
    t.true(Math.abs(value - end[key]) < 100)
  })
})

test('error metric should return boolean based on fn errors', t => {
  const err = error()

  // no errors for these return values
  t.is(err(), 0)
  t.is(err({}), 0)
  t.is(err({hello: "world"}), 0)

  // errors for these return values
  t.is(err({error: "hello"}), 1)
})


test('time metric should return start, finish and duration', t => {
  const tme = time()

  const start = (new Date).getTime()
  tme.start()
  const now = Date.now();
  while (Date.now() - now < 100);

  const result = tme.end()
  const end = (new Date).getTime()

  t.is(result.duration, 100)
  t.deepEqual(result, { start, end, duration: end - start })
})

test('cold start metric should return bool for first invocations', t => {
  let cs = coldstart()

  t.is(cs(), 1)
  t.is(cs(), 0)
  t.is(cs(), 0)
  t.is(cs(), 0)

  cs = coldstart()

  t.is(cs(), 1)
  t.is(cs(), 0)
  t.is(cs(), 0)
  t.is(cs(), 0)
})

test('util.label function should return label name with or without activation id based on config parameter', t => {
  process.env['__OW_NAMESPACE'] = 'testNamespace';
  process.env['__OW_ACTION_NAME'] = '/testNamespace/testName';
  process.env['__OW_ACTIVATION_ID']= 'testActivationId';
  let result = util.label('testLabel', {});
  t.is(result, 'testNamespace.testAction.testActivationId.testlabel');
  let result = util.label('testLabel', {"ignore_activation_ids": null});
  t.is(result, 'testNamespace.testAction.testActivationId.testlabel');
  let result = util.label('testLabel', {"ignore_activation_ids": true});
  t.is(result, 'testNamespace.testAction.testlabel');
  let result = util.label('testLabel', {"ignore_activation_ids": false});
  t.is(result, 'testNamespace.testAction.testActivationId.testlabel');

})

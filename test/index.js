import test from 'ava'
import sinon from 'sinon'
import metrics from '../'

test.serial('should call function that is wrapped with event parameters', async t => {
  t.plan(1)
  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }

  const fn = evt => {
    t.deepEqual(evt, params)
  }

  const wrapped = metrics(fn)
  await wrapped(params)
})

test.serial('should return wrapped function value', async t => {
  t.plan(1)

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }

  const fn = () => params

  const result = await metrics(fn)()
  t.deepEqual(result, params)
})

test.serial('should return wrapped function error value', async t => {
  t.plan(1)

  const params = {
    error: 'failed'
  }

  const fn = () => params

  const result = await metrics(fn)()
  t.deepEqual(result, params)
})

test.serial('should return wrapped function promise value', async t => {
  t.plan(1)

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }
  const p = Promise.resolve(params)

  const fn = () => p

  const result = await metrics(fn)()
  t.is(result, params)
})

test.serial('should return wrapped function rejected promise value as error', async t => {
  t.plan(1)

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }
  const p = Promise.reject(params)

  const fn = () => p

  const result = await metrics(fn)()
  t.deepEqual(result, { error: params })
})

test.serial('should run fn metric collectors for each invocation', async t => {
  t.plan(3)

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }

  const fn = () => params

  metrics.collect = {
    a: evt => t.deepEqual(evt, params),
    b: evt => t.deepEqual(evt, params),
    c: evt => t.deepEqual(evt, params)
  }

  await metrics(fn)(params)
})

test.serial('should run fn metric collectors for each invocation which returns promise', async t => {
  t.plan(3)

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }

  const fn = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(params)
      }, 10)
    })
  }

  metrics.collect = {
    a: evt => t.deepEqual(evt, params),
    b: evt => t.deepEqual(evt, params),
    c: evt => t.deepEqual(evt, params)
  }

  await metrics(fn)(params)
})

test.serial('should run obj metric collectors for each invocation', async t => {
  t.plan(4)

  const input = {
    b: 1,
    foo: 'bar',
    bool: true
  }

  const params = {
    a: 1,
    hello: 'world',
    bool: false
  }

  const fn = () => params

  metrics.collect = {
    a: {
      start: evt => t.deepEqual(evt, input),
      end: evt => t.deepEqual(evt, params)
    },
    b: {
      start: evt => t.deepEqual(evt, input)
    },
    c: {
      end: evt => t.deepEqual(evt, params)
    }
  }

  await metrics(fn)(input)
})

test.serial('should run metric collectors in order for each invocation', async t => {
  const fn = sinon.spy()

  metrics.collect = {
    a: {
      start: sinon.spy(),
      end: sinon.spy()
    },
    b: {
      start: sinon.spy()
    },
    c: {
      end: sinon.spy()
    },
    d: sinon.spy()
  }

  await metrics(fn)()

  const c = metrics.collect
  t.true(c.a.start.calledBefore(c.a.end))
  t.true(c.a.start.calledBefore(c.c.end))
  t.true(c.a.start.calledBefore(c.d))
  t.true(c.a.start.calledBefore(fn))

  t.true(c.a.end.calledAfter(c.b.start))
  t.true(c.a.end.calledAfter(fn))

  t.true(c.b.start.calledBefore(fn))
  t.true(c.b.start.calledBefore(c.a.end))
  t.true(c.b.start.calledBefore(c.c.end))
  t.true(c.b.start.calledBefore(c.d))

  t.true(c.c.end.calledAfter(fn))
  t.true(c.c.end.calledAfter(c.a.start))
  t.true(c.c.end.calledAfter(c.b.start))

  t.true(c.d.calledAfter(fn))
  t.true(c.d.calledAfter(c.a.start))
  t.true(c.d.calledAfter(c.b.start))
})

test.serial('should merge inner metric values before calling metric service', async t => {
  t.plan(9)

  const label = metrics.label
  metrics.label = label => label

  const fn = () => ({})

  metrics.collect = {
    foo: () => ({ a: 2.0, b: { c: 3.0, d: 5 }, d: { e: { f: 4 }} })
  }

  const timestamp = Math.floor(new Date() / 1000)
  metrics.service = {
    save: (data) => {
      t.is(data.length, 4)
      t.is(data[0].name, 'foo.a')
      t.is(data[0].value, 2)
      t.is(data[1].name, 'foo.b.c')
      t.is(data[1].value, 3)
      t.is(data[2].name, 'foo.b.d')
      t.is(data[2].value, 5)
      t.is(data[3].name, 'foo.d.e.f')
      t.is(data[3].value, 4)
    }
  }

  await metrics(fn)({})
  metrics.label = label
})

test.serial('should ignore invalid metric values', async t => {
  t.plan(3)

  const fn = () => ({})

  const label = metrics.label
  metrics.label = label => label

  metrics.collect = {
    valid: () => 1,
    foo: () => true,
    n: () => null,
    bar: () => "hello",
    baz: () => {},
    semi: () => ({
      wrong: 'blah',
      correct: 2.0
    }),
    baa: () => [],
    bab: () => () => {}
  }

  metrics.service = {
    save: (data) => {
      t.is(data.length, 2)
      t.is(data[0].name, 'valid')
      t.is(data[1].name, 'semi.correct')
    }
  }

  await metrics(fn)({})
  metrics.label = label
})

test.serial('should call synchronous metric service with collected metrics for each invocation', async t => {
  t.plan(7)

  const label = metrics.label
  metrics.label = label => label

  const fn = () => ({})

  metrics.collect = {
    foo: () => 1.0,
    bar: () => 2.0,
    baz: () => 3.0
  }

  const timestamp = Math.floor(new Date() / 1000)
  metrics.service = {
    save: (data) => {
      t.is(data.length, Object.keys(metrics.collect).length)
      data.forEach(d => {
        t.is(d.value, metrics.collect[d.name]())
        t.is(d.timestamp, timestamp)
      })
    }
  }

  await metrics(fn)({})
  metrics.label = label
})

test.serial('should call asynchronous metric service with collected metrics for each invocation', async t => {
  t.plan(7)

  const label = metrics.label
  metrics.label = label => label

  const fn = () => ({})

  metrics.collect = {
    foo: () => 1.0,
    bar: () => 2.0,
    baz: () => 3.0
  }

  const timestamp = Math.floor(new Date() / 1000)
  metrics.service = {
    save: (data) => {
      return new Promise(resolve => {
        setTimeout(() => {
          t.is(data.length, Object.keys(metrics.collect).length)
          data.forEach(d => {
            t.is(d.value, metrics.collect[d.name]())
            t.is(d.timestamp, timestamp)
          })
          resolve()
        }, 10)
      })
    }
  }

  await metrics(fn)({})
  metrics.label = label
})

test.serial('should call handle asynchronous metric service which fails', async t => {
  const fn = () => ({hello: "world"})

  metrics.collect = {}

  metrics.service = {
    save: (data) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject()
        }, 10)
      })
    }
  }

  const result = await metrics(fn)({})
  t.deepEqual(result, {hello: "world"})
})

test.serial('should prefix metric names with env params', async t => {
  t.plan(4)

  const fn = () => ({})

  // MUST ESCAPE VALUES
  const ns = 'ns'
  const id = '/ns/params'
  const actv = '1234'

  process.env['__OW_NAMESPACE'] = ns
  process.env['__OW_ACTION_NAME'] = id
  process.env['__OW_ACTIVATION_ID'] = actv

  metrics.collect = {
    foo: () => 1.0,
    bar: () => 2.0,
    baz: () => 3.0
  }

  metrics.service = {
    save: (data) => {
      t.is(data.length, Object.keys(metrics.collect).length)
      const labels = data.map(d => d.name)
      Object.keys(metrics.collect).forEach(name => {
        t.true(labels.includes(`${ns}.params.${actv}.${name}`))
      })
    }
  }

  await metrics(fn)({})
  delete process.env['__OW_NAMESPACE']
  delete process.env['__OW_ACTION_NAME']
  delete process.env['__OW_ACTIVATION_ID']
})

test.serial('should handle encoding labels as metric names', t => {
  // simple id with no package
  let ns = 'ns'
  let id = '/ns/params'
  const actv = '1234'

  process.env['__OW_NAMESPACE'] = ns
  process.env['__OW_ACTION_NAME'] = id
  process.env['__OW_ACTIVATION_ID'] = actv

  t.is(metrics.label('foo'), `${ns}.params.${actv}.foo`)

  // id with package
  id = '/ns/package/params'
  process.env['__OW_ACTION_NAME'] = id
  t.is(metrics.label('foo'), `${ns}.package/params.${actv}.foo`)

  // namespace and name with dots
  ns = 'name.name@email.host.com_dev'
  id = `/${ns}/package/params.hello`
  process.env['__OW_NAMESPACE'] = ns
  process.env['__OW_ACTION_NAME'] = id
  t.is(metrics.label('foo'), `${ns.replace(/\./g, '_')}.package/params_hello.${actv}.foo`)
})

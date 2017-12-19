# openwhisk-metrics

Node.js library to collect serverless application metrics from [OpenWhisk actions](https://github.com/apache/incubator-openwhisk/blob/master/docs/actions.md).

Serverless functions are wrapped with a proxy to automate recording metrics during invocations.

Metric values for `cpu`, `memory`, `time`, `error` and `cold start` collected by default. Supports adding custom metric values.

## usage

Wrap action handlers with the metrics library.

```javascript
const metrics = require('openwhisk-metrics')

const main = params => {
  return { message: "Hello World" }
}

module.exports.main = metrics(main) 
```

Metrics values are logged to stdout for each invocation of the serverless function.

```
METRIC <workspace>.<action_name>.<activation>.memory.rss 53018624 1512489781
METRIC <workspace>.<action_name>.<activation>.memory.heapTotal 34463744 1512489781
METRIC <workspace>.<action_name>.<activation>.memory.heapUsed 16955224 1512489781
METRIC <workspace>.<action_name>.<activation>.memory.external 987361 1512489781
METRIC <workspace>.<action_name>.<activation>.error 0 1512489781
METRIC <workspace>.<action_name>.<activation>.coldstart 0 1512489781
METRIC <workspace>.<action_name>.<activation>.cpu.user 177 1512489781
METRIC <workspace>.<action_name>.<activation>.cpu.system 2 1512489781
METRIC <workspace>.<action_name>.<activation>.time.start 1511605588388 1512489781
METRIC <workspace>.<action_name>.<activation>.time.end 1511605588468 1512489781
METRIC <workspace>.<action_name>.<activation>.time.duration 80 1512489781
```

See ["Forwarding Metrics"](#forwarding-metrics) for options on sending metric values to external monitoring services.

## installation

```
$ npm install openwhisk-metrics
```

## configuration

### metrics

The library will execute the metric collection handlers registered in `metrics.collect`.

The default metric handlers configured to run are `cpu`, `memory`, `time`, `error` and `cold start`.

#### cpu

Returns the values of `process.cpuUsage()` for the function execution duration. This can be used to calculate cpu usage during function execution based upon duration. See [Node.js documentation](https://nodejs.org/api/process.html#process_process_cpuusage_previousvalue) for meaning of these values.

```json
{
  "user": <microseconds>,
  "system": <microseconds>
}
```

#### memory

Returns the values for `process.memoryUsage` when the wrapped function finishes. See [Node.js documentation](https://nodejs.org/api/process.html#process_process_memoryusage) for meaning of these values.

```json
{
  "rss": <bytes>,
  "heapTotal": <bytes>,
  "heapUsed": <bytes>,
  "external": <bytes>
}
```

#### time

Returns start, end and duration times for function execution. `start` and `end` are in milliseconds since epoch. Duration is the difference between `end` and `start` in milliseconds.

```json
{
  "start": <millseconds_since_epoch>,
  "end": <millseconds_since_epoch>,
  "duration": <milliseconds_since_start>
}
```

#### error

Returns whether wrapped function returns an error. Handles errors returned directly or using rejected Promises. If error was returned, metric value is `0`. If error was not returned, metric value is `1`.

```json
{
  "error": 0 or 1
}
```

#### cold start

Returns whether a new runtime environment is used for execution.  This is used to record cold and warm invocations.

The first time a new runtime environment is used, `coldstart` will be `1`. All further invocations using an existing environment return `0`.

```json
{
  "coldstart": 0 or 1
}
```

### disable default metrics

Metrics can be disabled by removing the metric handler from `metrics.collect`.

```javascript
// disable cpu metric
metrics.collect.cpu = null
```

## add custom metrics

Set additional properties on the `metrics.collect` object to collect custom metrics.

```javascript
metrics.collect.custom = action_response => {
  return 12345
}
```

Property names on the `metrics.collect` object are used as metric labels, e.g. `custom`. Return values from the functions are used as metric values.

**Metric values must be a number. Strings, booleans and other types are not supported.** 

Metric functions can either return a raw metric value or multiple sub-properties.

```javascript
// single value....
metrics.collect.custom = action_response => {
  return 12345
}
// multiple values
metrics.collect.custom = action_response => {
  return {inner: 12345, ...}
}
```

Metric functions are called once the wrapped function has returned, with the return value of that invocation.

If you need to capture execution context prior to the invocation, set a metric handler using an object with `start` and `end` methods.

```javascript
// let's record start time for invocations...
let start

metrics.collect.start_times = {
  start: evt_params => {
    start = (new Date()).getTime()
  },
  end: fn_return_val => start
}
```

`start` will be executed with invocation parameters prior to the wrapped handler being called. `end` will be executed with return value from wrapped function after invocation.

## forwarding metrics

### background action

Metric values collected during execution are logged to stdout in the following format.

```
METRIC <metric.label.name> <value> <timestamp> 
```

Using the [alarm trigger feed](https://github.com/apache/incubator-openwhisk-package-alarms), an action can run on a [periodic schedule](https://github.com/apache/incubator-openwhisk-package-alarms#firing-a-trigger-event-periodically-on-an-interval-based-schedule) to retrieve metrics from actions logs. This action can forward metric values to external monitoring services.

### custom agent

Custom agents can be provided to handle forwarding metrics live during invocations.

Overwrite the `service` property on the `metrics` class to use a custom forwarding agent.

Agents must be an object with a `save` method. This method is called with an array of metric values for each invocation.

```javascript
metrics.service = {
  save: metrics => {
    // do some async save
    return asyncServiceCall(metrics)
  }
}
```

Metric service agents can return a Promise for asynchronous operations.

## issues / bugs / features?

Something gone wrong? OH NOES 😱!

Open an issue in the repository and I'll have a look… 💯

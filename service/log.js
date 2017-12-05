const format = metric => `METRIC ${metric.name} ${metric.value} ${metric.timestamp}`

const save = values => values.forEach(value => console.log(format(value)))

module.exports = { save }

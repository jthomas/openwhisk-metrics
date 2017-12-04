module.exports = () => {
  let begin

  start = () => begin = process.cpuUsage()
  end = () => process.cpuUsage(begin)

  return { start, end }
}

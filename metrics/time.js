module.exports = () => {
  let begin

  epoch = () => (new Date).getTime()

  start = () => begin = epoch()
  end = () => {
    const ended = epoch()
    return {
      start: begin,
      end: ended,
      duration: ended - begin
    }
  }

  return { start, end }
}

module.exports = () => {
  let coldstart = 1

  return () => {
    let current = coldstart
    coldstart = 0
    return current
  }
}
  

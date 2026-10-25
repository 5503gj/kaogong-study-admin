// 统计：与 Web 版 src/lib/stats.ts 对应（去掉 date-fns，手写日期循环）
// 纯函数，可直接复用。

function fmt(d) {
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
}

function computeStats(sessions, todos, goal) {
  const totalMinutes = sessions.reduce((s, x) => s + (x.duration || 0), 0)
  const sessionCount = sessions.length

  const daySet = {}
  sessions.forEach((s) => { daySet[s.date] = true })
  const studyDays = Object.keys(daySet).length
  const avg = studyDays ? totalMinutes / studyDays : 0

  const subj = {}
  sessions.forEach((s) => {
    if (!subj[s.subject]) subj[s.subject] = { subject: s.subject, minutes: 0, count: 0 }
    subj[s.subject].minutes += s.duration || 0
    subj[s.subject].count += 1
  })
  const bySubject = Object.values(subj).sort((a, b) => b.minutes - a.minutes)

  const trend = []
  for (let i = 29; i >= 0; i--) {
    const key = fmt(new Date(Date.now() - i * 86400000))
    const m = sessions.filter((s) => s.date === key).reduce((a, s) => a + s.duration, 0)
    trend.push({ date: key, minutes: m })
  }
  const last7 = trend.slice(-7).reduce((a, p) => a + p.minutes, 0)
  const last30 = trend.reduce((a, p) => a + p.minutes, 0)

  const todayKey = fmt(new Date())
  const todayMinutes = sessions.filter((s) => s.date === todayKey).reduce((a, s) => a + s.duration, 0)

  const todoTotal = todos.length
  const todoDone = todos.filter((t) => t.status === 'done').length
  const todoDoing = todos.filter((t) => t.status === 'doing').length

  const goalDailyMinutes = goal.dailyMinutes || 0
  const goalProgress = goalDailyMinutes > 0 ? Math.min(1, todayMinutes / goalDailyMinutes) : 0

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    sessionCount,
    studyDays,
    avgMinutesPerActiveDay: avg,
    bySubject,
    trend,
    last7Minutes: last7,
    last30Minutes: last30,
    todoTotal,
    todoDone,
    todoDoing,
    goalDailyMinutes,
    todayMinutes,
    goalProgress
  }
}

module.exports = { computeStats }

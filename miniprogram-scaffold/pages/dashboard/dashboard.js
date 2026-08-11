// 看板页：直接复用 Web 版统计纯函数（utils/stats.js）
const store = require('../../utils/store.js')
const { computeStats } = require('../../utils/stats.js')

Page({
  data: { stats: {} },
  onShow() {
    const s = computeStats(store.getSessions(), store.getTodos(), store.getGoal())
    this.setData({
      stats: {
        totalHours: s.totalHours.toFixed(1),
        sessionCount: s.sessionCount,
        studyDays: s.studyDays,
        avgMinutesPerActiveDay: Math.round(s.avgMinutesPerActiveDay),
        last7Minutes: s.last7Minutes,
        last30Minutes: s.last30Minutes,
        todoDone: s.todoDone,
        todoTotal: s.todoTotal,
        todoDoing: s.todoDoing,
        bySubject: s.bySubject
      }
    })
  }
})

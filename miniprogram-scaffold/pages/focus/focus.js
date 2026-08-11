// 专注模式页：全屏计时 + 切出检测（onHide/onShow）+ 结束警醒
// 在小程序里，切到别的 App / 锁屏 / 离开页面都会触发 onHide，借此记录切出次数与离开时长
const store = require('../../utils/store.js')

function mmss(s) {
  s = Math.max(0, Math.floor(s))
  const m = Math.floor(s / 60)
  const r = s % 60
  return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r)
}

Page({
  data: {
    status: 'setup', // setup | running | done
    subject: '',
    planned: 25,
    note: '',
    elapsed: 0,
    switchCount: 0,
    awaySeconds: 0,
    summary: null,
    history: []
  },
  onLoad() {
    this.isAway = false
    this.awayStart = 0
    this.setData({ history: store.getFocusSessions().slice(0, 10) })
  },
  onUnload() { this.clearTimer() },
  clearTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } },

  onSubject(e) { this.setData({ subject: e.detail.value }) },
  onPlanned(e) { this.setData({ planned: Number(e.detail.value) || 1 }) },
  onNote(e) { this.setData({ note: e.detail.value }) },

  start() {
    const subject = this.data.subject.trim() || '综合学习'
    this.isAway = false
    this.awayStart = 0
    this.setData({
      status: 'running',
      subject,
      elapsed: 0,
      switchCount: 0,
      awaySeconds: 0,
      summary: null
    })
    this.clearTimer()
    this.timer = setInterval(() => {
      if (!this.isAway) this.setData({ elapsed: this.data.elapsed + 1 })
    }, 1000)
  },

  // 离开页面 / 切后台 → 记录一次切出并开始计时离开
  onHide() {
    if (this.data.status === 'running' && !this.isAway) {
      this.isAway = true
      this.awayStart = Date.now()
      this.setData({ switchCount: this.data.switchCount + 1 })
    }
  },
  // 回到页面 → 结算离开时长
  onShow() {
    if (this.data.status === 'running' && this.isAway) {
      const dt = (Date.now() - this.awayStart) / 1000
      this.isAway = false
      this.setData({ awaySeconds: this.data.awaySeconds + dt })
      wx.showModal({
        title: '检测到切出',
        content: '你离开了专注，已记录并计入离开时长。专注完再走效果更好。',
        showCancel: false
      })
    }
  },

  end() {
    this.clearTimer()
    const summary = {
      effective: this.data.elapsed,
      switchCount: this.data.switchCount,
      awaySeconds: Math.round(this.data.awaySeconds),
      planned: this.data.planned,
      subject: this.data.subject
    }
    store.addFocusSession({
      startedAt: Date.now() - (this.data.elapsed + this.data.awaySeconds) * 1000,
      endedAt: Date.now(),
      plannedMinutes: this.data.planned,
      subject: this.data.subject,
      note: this.data.note || undefined,
      switchCount: summary.switchCount,
      awaySeconds: summary.awaySeconds
    })
    this.setData({ status: 'done', summary, history: store.getFocusSessions().slice(0, 10) })
  },

  again() { this.setData({ status: 'setup' }) },

  mmss
})

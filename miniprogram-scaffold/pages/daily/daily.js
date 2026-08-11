// 每日任务页：按天查看 / 新增 / 打卡 / 删除
const store = require('../../utils/store.js')

function today() {
  return new Date().toISOString().slice(0, 10)
}

Page({
  data: {
    date: '',
    list: [],
    title: '',
    subject: ''
  },
  onShow() {
    const date = today()
    this.setData({ date })
    this.refresh()
  },
  refresh() {
    const list = store.getDailyTasks().filter((t) => t.date === this.data.date)
    list.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt)
    this.setData({ list })
  },
  onDate(e) {
    this.setData({ date: e.detail.value })
    this.refresh()
  },
  onTitle(e) { this.setData({ title: e.detail.value }) },
  onSubject(e) { this.setData({ subject: e.detail.value }) },
  add() {
    const title = this.data.title.trim()
    if (!title) {
      wx.showToast({ title: '请输入任务', icon: 'none' })
      return
    }
    store.addDailyTask({
      date: this.data.date,
      title,
      subject: this.data.subject.trim() || undefined,
      done: false
    })
    this.setData({ title: '', subject: '' })
    this.refresh()
    wx.showToast({ title: '已添加', icon: 'success' })
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((t) => t.id === id)
    store.updateDailyTask(id, { done: !item.done })
    this.refresh()
  },
  del(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除这条任务吗？',
      success: (r) => {
        if (r.confirm) {
          store.removeDailyTask(id)
          this.refresh()
        }
      }
    })
  }
})

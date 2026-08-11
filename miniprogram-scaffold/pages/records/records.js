// 学习记录页：列表 + 新增 + 删除（编辑可参考新增扩展）
const store = require('../../utils/store.js')

function today() {
  return new Date().toISOString().slice(0, 10)
}

Page({
  data: {
    sessions: [],
    showForm: false,
    form: { date: '', subject: '', title: '', duration: '60' }
  },
  onShow() {
    this.setData({ sessions: store.getSessions() })
  },
  toggleForm() {
    this.setData({
      showForm: !this.data.showForm,
      form: { date: today(), subject: '', title: '', duration: '60' }
    })
  },
  onDate(e) { this.setData({ 'form.date': e.detail.value }) },
  onSubject(e) { this.setData({ 'form.subject': e.detail.value }) },
  onTitle(e) { this.setData({ 'form.title': e.detail.value }) },
  onDuration(e) { this.setData({ 'form.duration': e.detail.value }) },
  save() {
    const f = this.data.form
    if (!f.subject || !f.title || !f.date) {
      wx.showToast({ title: '请填写完整', icon: 'none' })
      return
    }
    store.addSession({
      date: f.date,
      subject: f.subject,
      title: f.title,
      duration: Number(f.duration) || 0,
      status: 'completed',
      rating: 3
    })
    this.setData({ sessions: store.getSessions(), showForm: false })
    wx.showToast({ title: '已添加', icon: 'success' })
  },
  del(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条记录吗？',
      success: (r) => {
        if (r.confirm) {
          store.removeSession(id)
          this.setData({ sessions: store.getSessions() })
        }
      }
    })
  }
})

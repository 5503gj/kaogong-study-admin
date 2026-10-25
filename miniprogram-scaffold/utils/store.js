// 数据层：复用 Web 版的数据模型，基于 wx 存储实现 CRUD
// 对应 Web 版 src/lib/storage.ts + src/context/DataContext.tsx
// 若以后接「微信云开发 / 自有后端」，只需替换本文件的读写实现，页面无需改动。

const SESSIONS_KEY = 'study-admin:sessions'
const TODOS_KEY = 'study-admin:todos'
const DAILY_KEY = 'study-admin:dailyTasks'
const FOCUS_KEY = 'study-admin:focusSessions'
const GOAL_KEY = 'study-admin:goal'
const SEED_FLAG = 'study-admin:seeded'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    return v === '' || v == null ? fallback : v
  } catch (e) {
    return fallback
  }
}
function write(key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) { throw new Error('本地保存失败，请备份后重试') }
}
function fmt(d) {
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
}

function buildSeed() {
  const SUBJECTS = ['前端开发', 'React', 'TypeScript', '算法', '英语', '项目实战']
  const TITLES = ['看视频教程', '做练习题', '阅读官方文档', '动手写代码', '整理笔记', '调试 Bug']
  const sessions = []
  let created = Date.now()
  for (let i = 0; i < 30; i++) {
    if (i % 7 === 6) continue
    const day = new Date(Date.now() - i * 86400000)
    const count = 1 + (i % 2)
    for (let j = 0; j < count; j++) {
      sessions.push({
        id: uid(),
        date: fmt(day),
        subject: SUBJECTS[(i + j) % SUBJECTS.length],
        title: TITLES[(i + j) % TITLES.length],
        duration: 30 + ((i * 7 + j * 13) % 90),
        status: 'completed',
        rating: 3 + (j % 3),
        notes: '',
        createdAt: created++
      })
    }
  }
  const add = (days) => fmt(new Date(Date.now() + days * 86400000))
  const todos = [
    { id: uid(), subject: '项目实战', title: '完成学习管理后台的看板页', priority: 'high', status: 'doing', targetDate: add(3), notes: '', createdAt: created++ },
    { id: uid(), subject: '算法', title: '刷 10 道二叉树题目', priority: 'medium', status: 'todo', targetDate: add(7), notes: '', createdAt: created++ },
    { id: uid(), subject: 'React', title: '掌握 React Router 路由守卫', priority: 'high', status: 'done', notes: '', createdAt: created++, completedAt: Date.now() }
  ]
  const dailyTasks = [
    { id: uid(), date: fmt(new Date()), title: '复习 React Router 路由守卫', subject: 'React', done: false, createdAt: created++ },
    { id: uid(), date: fmt(new Date()), title: '完成一道二叉树中等题', subject: '算法', done: false, createdAt: created++ },
    { id: uid(), date: fmt(new Date()), title: '阅读 TypeScript 泛型章节', subject: 'TypeScript', done: true, createdAt: created++ }
  ]
  return { sessions, todos, dailyTasks }
}

function seedIfEmpty() {
  if (!wx.getStorageSync(SEED_FLAG)) {
    const seed = buildSeed()
    write(SESSIONS_KEY, seed.sessions)
    write(TODOS_KEY, seed.todos)
    write(DAILY_KEY, seed.dailyTasks)
    wx.setStorageSync(SEED_FLAG, '1')
  }
}

// ---- 学习记录 Sessions ----
function getSessions() { seedIfEmpty(); return read(SESSIONS_KEY, []) }
function addSession(s) {
  const list = getSessions()
  list.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, s))
  write(SESSIONS_KEY, list)
  return list
}
function updateSession(id, patch) {
  const list = getSessions().map((x) => (x.id === id ? Object.assign({}, x, patch) : x))
  write(SESSIONS_KEY, list)
  return list
}
function removeSession(id) {
  const list = getSessions().filter((x) => x.id !== id)
  write(SESSIONS_KEY, list)
  return list
}

// ---- 待学清单 Todos ----
function getTodos() { seedIfEmpty(); return read(TODOS_KEY, []) }
function addTodo(t) {
  const list = getTodos()
  list.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, t))
  write(TODOS_KEY, list)
  return list
}
function updateTodo(id, patch) {
  const list = getTodos().map((x) => (x.id === id ? Object.assign({}, x, patch) : x))
  write(TODOS_KEY, list)
  return list
}
function removeTodo(id) {
  const list = getTodos().filter((x) => x.id !== id)
  write(TODOS_KEY, list)
  return list
}

// ---- 目标 Goal ----
function getGoal() { return read(GOAL_KEY, { dailyMinutes: 60, weeklyDays: 5 }) }
function setGoal(g) { write(GOAL_KEY, g); return g }

// ---- 每日任务 DailyTasks ----
function getDailyTasks() { seedIfEmpty(); return read(DAILY_KEY, []) }
function addDailyTask(t) {
  const list = getDailyTasks()
  list.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, t))
  write(DAILY_KEY, list)
  return list
}
function updateDailyTask(id, patch) {
  const list = getDailyTasks().map((x) => (x.id === id ? Object.assign({}, x, patch) : x))
  write(DAILY_KEY, list)
  return list
}
function removeDailyTask(id) {
  const list = getDailyTasks().filter((x) => x.id !== id)
  write(DAILY_KEY, list)
  return list
}

// ---- 专注记录 FocusSessions ----
function getFocusSessions() { seedIfEmpty(); return read(FOCUS_KEY, []) }
function addFocusSession(f) {
  const list = getFocusSessions()
  list.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, f))
  write(FOCUS_KEY, list)
  return list
}

module.exports = {
  getSessions, addSession, updateSession, removeSession,
  getTodos, addTodo, updateTodo, removeTodo,
  getDailyTasks, addDailyTask, updateDailyTask, removeDailyTask,
  getFocusSessions, addFocusSession,
  getGoal, setGoal
}

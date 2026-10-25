import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  Download,
  Layers3,
  LoaderCircle,
  Play,
  RotateCcw,
  ScanLine,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useData } from '@/context/data'
import {
  addDays,
  calendarText,
  localDate,
  runPilot,
  type PilotEvent,
  type PilotMode,
  type PilotPlan,
} from '@/lib/study-pilot'
import { Button } from '@/components/ui/button'

const strategies = [
  { id: 'balanced', label: '稳步推进', note: '方法练习与错题回看交替安排' },
  { id: 'weakness', label: '优先补弱', note: '把未掌握的考点转成专项任务' },
  { id: 'sprint', label: '限时冲刺', note: '以限时模拟和复盘组织每一天' },
] as const

export function Pilot() {
  const {
    sessions,
    wrongQuestions,
    goal,
    dailyTasks,
    commitDailyTasks,
    updateWrongQuestion,
  } = useData()
  const [minutes, setMinutes] = useState(
    Math.min(240, Math.max(10, goal.dailyMinutes || 60)),
  )
  const [days, setDays] = useState(Math.max(1, goal.weeklyDays))
  const [mode, setMode] = useState<PilotMode>('balanced')
  const [plan, setPlan] = useState<PilotPlan | null>(null)
  const [events, setEvents] = useState<PilotEvent[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)
  const runId = useRef(0),
    inFlight = useRef(false)
  useEffect(
    () => () => {
      runId.current++
      controller.current?.abort()
    },
    [],
  )
  const invalidate = () => {
    setPlan(null)
    setEvents([])
    setReceipt(null)
  }
  const start = async () => {
    if (inFlight.current) return
    inFlight.current = true
    const id = ++runId.current,
      abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setPlan(null)
    setReceipt(null)
    setEvents([])
    try {
      const result = await runPilot(
        {
          startDate: localDate(new Date()),
          minutes,
          days,
          mode,
          sessions,
          wrongQuestions,
        },
        (event) => {
          if (id === runId.current)
            setEvents((previous) => [
              ...previous.filter((row) => row.tool !== event.tool),
              event,
            ])
        },
        abort.signal,
      )
      if (id !== runId.current) return
      setPlan(result)
      setSelected(
        new Set(
          result.tasks
            .filter((task) => !dailyTasks.some((row) => row.id === task.id))
            .map((task) => task.id),
        ),
      )
    } catch (error) {
      if (abort.signal.aborted && id === runId.current)
        setEvents((previous) =>
          previous.map((event) =>
            event.status === 'running'
              ? { ...event, status: 'cancelled', detail: '已取消，未写入任务' }
              : event,
          ),
        )
      if (!abort.signal.aborted)
        toast.error(error instanceof Error ? error.message : '计划生成失败')
    } finally {
      inFlight.current = false
      if (id === runId.current) setBusy(false)
    }
  }
  const confirm = async () => {
    if (!plan || saving || selected.size === 0) return
    setSaving(true)
    try {
      const count = await commitDailyTasks(
        plan.tasks.filter((task) => selected.has(task.id)),
      )
      setReceipt(count)
      setSelected(new Set())
      toast.success(`已保存${count}项任务到每日备考`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '计划未保存')
    } finally {
      setSaving(false)
    }
  }
  const exportCalendar = () => {
    if (!plan) return
    const chosen = plan.tasks.filter(
      (task) =>
        selected.has(task.id) || dailyTasks.some((row) => row.id === task.id),
    )
    if (!chosen.length) {
      toast.message('请先选择要导出的任务')
      return
    }
    const url = URL.createObjectURL(
      new Blob([calendarText(chosen)], { type: 'text/calendar;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `study-pilot-${plan.startDate}.ics`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const review = wrongQuestions
    .filter((row) => !row.mastered)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 4)
  return (
    <div className="pilot-page">
      <div className="page-eyebrow">
        <span className="status-dot" /> STUDY PILOT <span>学习计划工作流</span>
      </div>
      <header className="pilot-intro">
        <div>
          <h1>把下一步，安排明白。</h1>
          <p>
            从你的学习记录和错题出发，组织一周可执行的计划。
            <br className="hidden sm:block" />
            先看依据与任务，再决定是否加入日程。
          </p>
        </div>
        <div className="pilot-mode">
          <Workflow size={18} />
          <span>
            本地工具 Agent<small>四个工具 · 无需 API Key</small>
          </span>
        </div>
      </header>
      <div className="pilot-layout">
        <aside className="pilot-controls">
          <div className="section-kicker">01 / 设定方向</div>
          <h2>给这一周一个重心</h2>
          <fieldset disabled={busy || saving}>
            <legend className="sr-only">计划策略</legend>
            <div className="strategy-options">
              {strategies.map((item) => (
                <label
                  key={item.id}
                  className={mode === item.id ? 'strategy active' : 'strategy'}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={item.id}
                    checked={mode === item.id}
                    onChange={() => {
                      setMode(item.id)
                      invalidate()
                    }}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                  {mode === item.id ? (
                    <Check size={17} />
                  ) : (
                    <Circle size={15} />
                  )}
                </label>
              ))}
            </div>
            <div className="budget-input">
              <label htmlFor="pilot-minutes">
                每天新增计划预算{' '}
                <strong>
                  {minutes}
                  <small> 分钟</small>
                </strong>
              </label>
              <input
                id="pilot-minutes"
                type="range"
                min="10"
                max="240"
                step="5"
                value={minutes}
                onChange={(event) => {
                  setMinutes(Number(event.target.value))
                  invalidate()
                }}
              />
              <div>
                <span>轻量 10 min</span>
                <span>深度 240 min</span>
              </div>
            </div>
            <label className="days-input" htmlFor="pilot-days">
              每周学习天数
              <select
                id="pilot-days"
                value={days}
                onChange={(event) => {
                  setDays(Number(event.target.value))
                  invalidate()
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <option key={day} value={day}>
                    {day} 天
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <Button
            className="pilot-run"
            onClick={start}
            disabled={busy || saving}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}{' '}
            {busy ? '正在生成计划' : '生成我的七日计划'}
            <ArrowRight size={16} />
          </Button>
          {busy && (
            <button
              className="text-action"
              onClick={() => controller.current?.abort()}
            >
              取消本次运行
            </button>
          )}
          <p className="privacy-note">
            记录仅在当前浏览器内分析，不会发送给外部模型。每项任务都可以取消勾选。
          </p>
          <div className="pilot-evidence">
            <span>
              <BookOpen size={15} />
              {sessions.length} 条学习记录
            </span>
            <span>
              <Layers3 size={15} />
              {wrongQuestions.filter((row) => !row.mastered).length}{' '}
              条未掌握错题
            </span>
          </div>
        </aside>
        <section className="pilot-workspace" aria-label="计划工作区">
          <div className="workspace-title">
            <div>
              <div className="section-kicker">02 / 生成与校验</div>
              <h2>让过程看得见</h2>
            </div>
            <span className="quiet-badge">
              {busy ? '运行中' : plan ? '等待确认' : '准备就绪'}
            </span>
          </div>
          <div className="tool-track" aria-live="polite">
            {[
              '读取学习证据',
              '诊断与选择技能',
              '编排七日计划',
              '检查时间与重复规则',
            ].map((label, index) => {
              const event = events[index]
              return (
                <div className={`tool-node ${event?.status ?? ''}`} key={label}>
                  <span className="tool-symbol">
                    {event?.status === 'done' ? (
                      <Check size={16} />
                    ) : event?.status === 'running' ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {event?.detail ??
                        [
                          '本地记录与错题',
                          '按证据选择练习重心',
                          '在时间预算内排程',
                          '确认后才会写入',
                        ][index]}
                    </small>
                  </div>
                </div>
              )
            })}
          </div>
          {!plan && !busy && (
            <div className="pilot-empty">
              <div className="week-illustration" aria-hidden="true">
                {[30, 57, 40, 72, 48, 64, 24].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }}>
                    <i />
                  </span>
                ))}
              </div>
              <h3>一周的节奏，从这里开始</h3>
              <p>
                生成后，你会看到每天的安排、选择依据和预计用时。
                <br />
                不需要先配置模型，也不会自动改动现有任务。
              </p>
              <div className="empty-steps">
                <span>
                  <ScanLine size={16} />
                  分析
                </span>
                <ArrowRight size={14} />
                <span>
                  <CalendarDays size={16} />
                  排程
                </span>
                <ArrowRight size={14} />
                <span>
                  <CheckCheck size={16} />
                  确认
                </span>
              </div>
            </div>
          )}
          {plan && (
            <div className="plan-result">
              <div className="plan-summary">
                <div>
                  <h3>你的下一周</h3>
                  <p>
                    {plan.startDate} 至 {addDays(plan.startDate, 6)} ·{' '}
                    {plan.days} 个学习日 · 共{' '}
                    {plan.tasks.reduce((sum, task) => sum + task.minutes, 0)}{' '}
                    分钟
                  </p>
                </div>
                <button onClick={exportCalendar} className="text-action">
                  <Download size={15} /> 导出日历
                </button>
              </div>
              {plan.diagnosis.length > 0 && (
                <div className="diagnosis-strip">
                  {plan.diagnosis.slice(0, 3).map((row) => (
                    <div key={row.subject}>
                      <span>{row.subject}</span>
                      <strong>
                        {row.errors} <small>条待巩固</small>
                      </strong>
                      <small>{row.reason}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="week-plan">
                {Array.from({ length: 7 }, (_, offset) => {
                  const date = addDays(plan.startDate, offset),
                    tasks = plan.tasks.filter((row) => row.date === date)
                  return (
                    <div
                      className={`day-plan ${tasks.length ? '' : 'rest-day'}`}
                      key={date}
                    >
                      <div className="day-label">
                        <strong>
                          {
                            [
                              '周日',
                              '周一',
                              '周二',
                              '周三',
                              '周四',
                              '周五',
                              '周六',
                            ][new Date(`${date}T12:00:00`).getDay()]
                          }
                        </strong>
                        <span>{date.slice(5).replace('-', ' / ')}</span>
                      </div>
                      <div className="day-tasks">
                        {tasks.length ? (
                          tasks.map((task) => {
                            const exists = dailyTasks.some(
                              (row) => row.id === task.id,
                            )
                            return (
                              <label
                                className={`plan-task ${exists ? 'committed' : ''}`}
                                key={task.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={exists || selected.has(task.id)}
                                  disabled={exists || saving}
                                  onChange={() =>
                                    setSelected((previous) => {
                                      const next = new Set(previous)
                                      if (next.has(task.id))
                                        next.delete(task.id)
                                      else next.add(task.id)
                                      return next
                                    })
                                  }
                                />
                                <span>
                                  <strong>{task.title}</strong>
                                  <small>
                                    {exists ? '已在每日任务中' : task.reason}
                                  </small>
                                </span>
                              </label>
                            )
                          })
                        ) : (
                          <p>留白与休息，不新增任务</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="plan-approval">
                <p>
                  {receipt !== null ? (
                    <>
                      <CheckCheck size={18} />
                      本次已保存 {receipt} 项，重复生成不会重复加入。
                    </>
                  ) : (
                    <>已选 {selected.size} 项。确认后，才写入当前本地空间。</>
                  )}
                </p>
                <Button
                  onClick={confirm}
                  disabled={saving || selected.size === 0}
                >
                  {saving ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  确认加入每日任务
                </Button>
                {receipt !== null && (
                  <Link to="/daily" className="text-action">
                    查看每日备考 <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
              <p className="privacy-note">
                {plan.evidence.slice(2).join('。')}
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="review-section">
        <div className="review-heading">
          <div className="section-kicker">03 / 把计划接回行动</div>
          <h2>值得再做一次的题</h2>
          <p>按首次记录时间排列的未掌握错题，是否真正掌握由你判断。</p>
        </div>
        <div className="review-list">
          {review.length ? (
            review.map((row) => (
              <article key={row.id}>
                <span className="quiet-badge">{row.subject}</span>
                <h3>{row.questionText || row.errorType || '照片错题'}</h3>
                <p>{row.whyWrong}</p>
                <div>
                  <Link className="text-action" to="/wrong-analysis">
                    回看解析 <ArrowUpRight size={14} />
                  </Link>
                  <button
                    className="text-action"
                    onClick={() =>
                      updateWrongQuestion(row.id, { mastered: true })
                    }
                  >
                    <Check size={14} /> 已独立做对
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="review-zero">
              <CheckCheck size={23} />
              <p>
                还没有待巩固的错题。先做一组基线练习，再记录真正卡住的地方。
              </p>
              <Link className="text-action" to="/questions">
                去题库看看 <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>
      <div className="pilot-footnote">
        <Play size={13} /> 工具执行记录显示实际操作与结果，不展示模型隐藏推理。
        <Link to="/ai">
          打开对话助手 <ArrowUpRight size={13} />
        </Link>
        <button
          className="text-action"
          onClick={() => {
            controller.current?.abort()
            setPlan(null)
            setEvents([])
            setReceipt(null)
          }}
        >
          <RotateCcw size={13} /> 清空本次预览
        </button>
      </div>
    </div>
  )
}

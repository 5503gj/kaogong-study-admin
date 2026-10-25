import { NavLink } from 'react-router-dom'
import { ArrowUpRight, Command, GraduationCap, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { NAV } from '@/lib/navigation'

export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  return (
    <div className="rail-content">
      <NavLink to="/pilot" onClick={onNavigate} className="rail-brand">
        <span>
          <GraduationCap size={21} />
        </span>
        <div>
          <strong>知行</strong>
          <small>STUDY PILOT</small>
        </div>
        <ArrowUpRight size={15} />
      </NavLink>
      <div className="rail-caption">学习工作空间</div>
      <nav aria-label="主导航">
        {NAV.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `rail-link ${isActive ? 'active' : ''} ${index === 0 ? 'rail-pilot' : ''}`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {index === 0 && <small>NEW</small>}
          </NavLink>
        ))}
      </nav>
      <div className="rail-note">
        <Command size={17} />
        <div>
          <strong>少一点切换，多一点专注</strong>
          <small>Ctrl / ⌘ K 随时打开快捷导航</small>
        </div>
      </div>
      <footer>
        <ShieldCheck size={16} />
        <span>
          当前本地空间<strong>{user}</strong>
        </span>
      </footer>
    </div>
  )
}

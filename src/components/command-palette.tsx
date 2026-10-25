import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { NAV } from '@/lib/navigation'

export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="快捷导航"
      description="搜索并跳转学习工具"
    >
      <CommandInput placeholder="搜索计划、错题、专注、设置…" />
      <CommandList>
        <CommandEmpty>没有找到。试试“计划”或“错题”。</CommandEmpty>
        <CommandGroup heading="学习工具">
          {NAV.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.to}`}
              onSelect={() => {
                navigate(item.to)
                onOpenChange(false)
              }}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

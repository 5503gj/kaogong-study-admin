---
name: study-pilot
description: "扩展或维护知行 Study Pilot 的学习诊断、七日计划、确认写入和日历导出；适用于这个仓库的计划工具与界面工作。"
---

# study-pilot

1. 先读 PRODUCT.md、DESIGN.md 和 src/lib/study-pilot.ts。工具事件表示真实操作，规则模式不宣称调用了模型。

2. 计划只使用传入的本地记录和未掌握错题。新任务的分钟预算与既有任务负荷分开，不能推断未记录的时长。

3. 写入走 DataContext.commitDailyTasks / profile-store.transact，显示预览并由应用使用者确认后单事务提交；保持确定任务ID，重复确认不重复创建。

4. 备份契约在 src/lib/backup.ts，新增字段要兼容旧备份；凭证不落盘，外发画像遵循现有显式同意。

5. 验证核心行为用 npm test；界面改动用 npm run lint、npm run build、npm run test:e2e。e2e/pilot.spec.ts覆盖选择、配额失败、重复、导出、键盘与移动布局。

6. 输出变更时说明哪些工具实际执行、哪些依赖真实模型/数据。参考 docs/DESIGN_REFERENCES.md，避免无必要重写技术栈。

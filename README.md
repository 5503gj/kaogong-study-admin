# 考公备考系统 · Study Admin

一个面向个人备考的 React + TypeScript + Vite 原型，围绕“计划—学习记录—每日任务—错题分析—AI 答疑”形成闭环。数据默认保存在浏览器本地，适合先做个人工具和求职作品集演示。

## 功能

- 仪表盘：连续学习、科目分布、目标考试倒计时
- 学习记录：记录科目、时长和复盘笔记
- 每日计划：任务、优先级和完成状态
- 题库与错题分析：录入题目、答案、解析和复习状态
- 专注模式：番茄钟与专注统计
- AI 考公老师：默认本地启发式答疑，也支持配置兼容 OpenAI 协议的接口
- 数据备份：导出/导入本地 JSON
- 小程序迁移：`miniprogram-scaffold/` 与《小程序迁移指南.md》

## 本地运行

```powershell
npm install
npm run dev
```

生产构建：

```powershell
npm run build
```

## 公网访问

项目已配置 GitHub Pages 自动部署。推送到 `main` 后，GitHub Actions 会自动构建并发布：

https://5503gj.github.io/kaogong-study-admin/

首次启用时，需要在仓库 `Settings → Pages → Build and deployment` 中选择 `GitHub Actions`。

打开后可使用演示账号 `demo` / `123456`，也可以直接注册本地账号。账号、学习数据和 AI 配置只保存在当前浏览器，不会自动上传服务器。

## 说明

这是一个前端原型，不是官方考试资料库，也不替代正式教材和真题。仓库不包含个人隐私、API Key 或第三方题库原文。

---


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

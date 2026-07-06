# JSON Schema 可视化编辑器

一款基于 Electron 的可视化 JSON Schema 编辑器，提供直观的树形界面用于创建、编辑和管理 JSON Schema 文件。

## 功能特性

- 🌳 **可视化树形编辑**：直观的树形结构展示 JSON Schema 层级
- ✏️ **属性编辑面板**：实时编辑节点属性（类型、标题、描述、约束等）
- 👁️ **实时预览**：右侧面板实时展示生成的 JSON Schema 代码
- 📁 **导入导出**：支持从文件导入和导出 JSON Schema
- 🔗 **引用管理**：支持 $ref 引用和 definitions 管理
- ✅ **Schema 校验**：实时校验 JSON Schema 合法性
- 🎨 **现代化 UI**：基于 Tailwind CSS 的美观界面

## 技术栈

- **桌面框架**：Electron 28.x
- **前端框架**：React 18.x + TypeScript 5.x
- **构建工具**：Vite 5.x
- **样式方案**：Tailwind CSS 3.x
- **状态管理**：Zustand 4.x
- **代码编辑器**：Monaco Editor
- **JSON Schema 校验**：Ajv 8.x

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 启动 Electron 应用（新终端）
npm run electron:dev
```

### 构建生产版本

```bash
# 构建 Web 版本
npm run build

# 构建 Electron 桌面应用
npm run electron:build
```

## 项目结构

```
json-schema-viewer/
├── electron/              # Electron 主进程代码
│   ├── main.ts           # 主进程入口
│   └── preload.ts        # 预加载脚本
├── src/                  # React 渲染进程代码
│   ├── components/       # UI 组件
│   │   ├── Toolbar/      # 工具栏
│   │   ├── TreeEditor/   # 树形编辑器
│   │   ├── PropertyPanel/# 属性编辑面板
│   │   ├── CodePanel/    # JSON 代码面板
│   │   ├── RefManager/   # 引用管理
│   │   └── ContextMenu/  # 右键菜单
│   ├── stores/           # Zustand 状态管理
│   ├── services/         # 业务逻辑服务
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript 类型定义
│   └── styles/           # 全局样式
├── docs/                 # 设计文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 使用说明

1. **创建新 Schema**：点击工具栏的"新建"按钮，或点击"创建根节点"
2. **添加节点**：右键点击节点，选择"添加子节点"并选择类型
3. **编辑属性**：点击节点后，在中间面板编辑属性
4. **查看预览**：右侧面板实时显示生成的 JSON Schema
5. **保存文件**：点击工具栏的"保存"或"导出"按钮

## 快捷键

- `Ctrl+S`：保存
- `Ctrl+Z`：撤销
- `Ctrl+Y`：重做
- `Delete`：删除选中节点
- `Ctrl+C/V`：复制粘贴节点

## 许可证

MIT

# 初始化流程改进说明

## 变更概述

本次改进解决了初始化流程中文档和配置文件位置不一致的问题，统一将所有初始化输入放在 `init/` 目录下，提升了用户体验的一致性。

## 核心设计原则

**初始化期间：** 所有输入文件统一放在 `init/` 目录下
**初始化完成后：** 可选择归档到 `docs/project/` 作为长期资产维护

## 主要变更

### 1. 文件位置统一

| 文件类型 | 之前位置 | 现在位置 |
|---------|---------|---------|
| Stage A 文档 | `docs/project/` | `init/stage-a-docs/` |
| Blueprint | `docs/project/project-blueprint.json` | `init/project-blueprint.json` |

### 2. `start` 命令自动创建所有模板

运行 `start` 命令后自动创建：
- `init/stage-a-docs/requirements.md`
- `init/stage-a-docs/non-functional-requirements.md`
- `init/stage-a-docs/domain-glossary.md`
- `init/stage-a-docs/risk-open-questions.md`
- `init/project-blueprint.json`

### 3. 命令默认路径调整

| 命令 | 参数 | 默认值 |
|------|------|--------|
| `check-docs` | `--docs-root` | `init/stage-a-docs` |
| `validate` | `--blueprint` | `init/project-blueprint.json` |
| `apply` | `--blueprint` | `init/project-blueprint.json` |
| `scaffold` | `--blueprint` | `init/project-blueprint.json` |

### 4. `cleanup-init` 归档选项

| 选项 | 作用 |
|------|------|
| `--archive` | 归档所有（Stage A 文档 + Blueprint） |
| `--archive-docs` | 仅归档 Stage A 文档 |
| `--archive-blueprint` | 仅归档 Blueprint |

归档目标：`docs/project/`

## 新的工作流程

```
┌─────────────────────────────────────────────────────────┐
│  start                                                  │
│  └─ 自动创建:                                           │
│     - init/stage-a-docs/*.md (Stage A 文档模板)         │
│     - init/project-blueprint.json (Blueprint 模板)      │
├─────────────────────────────────────────────────────────┤
│  用户编辑 init/stage-a-docs/*.md 填写需求               │
├─────────────────────────────────────────────────────────┤
│  check-docs --strict                                    │
│  └─ 验证 Stage A 文档                                   │
├─────────────────────────────────────────────────────────┤
│  approve --stage A                                      │
├─────────────────────────────────────────────────────────┤
│  用户编辑 init/project-blueprint.json                   │
├─────────────────────────────────────────────────────────┤
│  validate                                               │
│  └─ 验证 Blueprint                                      │
├─────────────────────────────────────────────────────────┤
│  approve --stage B                                      │
├─────────────────────────────────────────────────────────┤
│  apply --providers both                                 │
│  └─ 应用脚手架、配置、技能包                            │
├─────────────────────────────────────────────────────────┤
│  approve --stage C                                      │
├─────────────────────────────────────────────────────────┤
│  cleanup-init [--archive]                               │
│  └─ 可选归档到 docs/project/ 后删除 init/               │
└─────────────────────────────────────────────────────────┘
```

## 命令参考

### start（初始化）

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs start --repo-root .
```

### check-docs（验证 Stage A 文档）

```bash
node init/.../init-pipeline.cjs check-docs --strict
```

### validate（验证 Blueprint）

```bash
node init/.../init-pipeline.cjs validate
```

### apply（应用配置）

```bash
node init/.../init-pipeline.cjs apply --providers both
```

### cleanup-init（清理）

```bash
# 删除 init/（不归档）
node init/.../init-pipeline.cjs cleanup-init --apply --i-understand

# 归档所有到 docs/project/ 后删除 init/
node init/.../init-pipeline.cjs cleanup-init --apply --i-understand --archive

# 归档 + 清理未使用的 add-ons
node init/.../init-pipeline.cjs cleanup-init --apply --i-understand --archive --cleanup-addons
```

## 涉及文件

- `init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs` - 主脚本
- `init/AGENTS.md` - Agent 指导文档

## 兼容性说明

- 所有命令仍支持显式指定路径参数覆盖默认值
- `--docs-root` 和 `--blueprint` 参数可用于自定义路径

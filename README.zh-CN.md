# PhyloPic MCP 服务器

[English](./README.md) | **中文**

> 版本 0.1.0

> **⚠️ 免责声明**：本项目是一个**非官方的第三方**实现，与 [PhyloPic](https://www.phylopic.org/) 或其维护者没有任何隶属、认可或官方关联。PhyloPic 是由 T. Michael Keesey 创建和维护的独立项目。本 MCP 服务器是一个独立的社区项目，仅封装了公开的 PhyloPic API。

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的服务器，用于与 [PhyloPic](https://www.phylopic.org/) 的 API 进行交互。PhyloPic 是一个开放数据库，提供可自由复用的生物剪影图像（包括动物、植物和其他生命形式），可通过系统发育（进化树）进行搜索。

## 概述

本 MCP 服务器将 PhyloPic API v2 的功能封装为一系列 MCP 工具，使 AI 助手（如 Claude）能够：

- **搜索生物类群**：通过学名搜索系统发育节点（例如"灵长目"、"人属"、"鸟纲"）
- **获取剪影图像**：查询单张图像的详细信息，包括各种分辨率的下载链接
- **浏览贡献者**：列出所有图像贡献者及其贡献统计
- **解析外部标识符**：将 GBIF、NCBI、Open Tree of Life 等外部数据库的 ID 解析为 PhyloPic 节点
- **查看分类谱系**：获取任意节点的祖先谱系链
- **检查 API 状态**：验证 PhyloPic API 的可用性

## 功能特性

- ✅ 完整封装 PhyloPic API v2 的所有只读端点
- ✅ 自动管理 API 构建号（build number），包括过期自动重试
- ✅ 通过 stdio 传输协议与 MCP 客户端通信
- ✅ 使用 Zod 进行输入参数验证
- ✅ 详细的错误处理和友好的错误消息
- ✅ 完全使用 TypeScript 编写，提供类型安全

## 安装

### 前置要求

- Node.js >= 18.0.0
- npm 或其他包管理器

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/ZengZichao/phylopic-mcp.git
cd phylopic-mcp

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

编译后的文件位于 `dist/` 目录下。

## 配置

### 在 Claude Desktop 中使用

在 Claude Desktop 的配置文件中添加 PhyloPic MCP 服务器。

**macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "phylopic": {
      "command": "node",
      "args": [
        "C:\\path\\to\\phylopic-mcp\\dist\\index.js"
      ]
    }
  }
}
```

> **注意**：请将路径替换为您实际的 `dist/index.js` 绝对路径。

### 在其他 MCP 客户端中使用

本服务器使用标准的 stdio 传输协议，兼容任何支持 MCP 的客户端。启动命令为：

```bash
node /path/to/phylopic-mcp/dist/index.js
```

### 使用 MCP Inspector 调试

```bash
npm run inspector
```

这将启动 MCP Inspector Web 界面，允许您交互式地测试所有工具。

## 可用工具

本服务器提供以下 16 个 MCP 工具：

### 1. `search_taxa` — 搜索类群

通过学名搜索系统发育节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 要搜索的学名（建议小写，例如 "primates"、"homo sapiens"） |
| `page` | number | 否 | 页码（从 0 开始），默认 0 |

**示例**：搜索 "primates" → 返回灵长目节点及其 UUID、名称、父节点等信息。

### 2. `autocomplete_taxa` — 类群名称自动补全

根据部分文本获取学名建议。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 部分搜索文本（例如 "prim"、"dros"） |

**示例**：查询 "prim" → 返回 ["primates", "primatiformes", "primatomorpha", ...]。

### 3. `get_node` — 获取节点详情

通过 UUID 获取特定系统发育节点的详细信息。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uuid` | string | 是 | 节点 UUID |
| `embed_parentNode` | boolean | 否 | 是否嵌入父节点数据，默认 false |
| `embed_primaryImage` | boolean | 否 | 是否嵌入主要图像数据，默认 false |

### 4. `get_node_lineage` — 获取祖先谱系

获取指定节点的祖先谱系链（从直接父节点到生命之根）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uuid` | string | 是 | 节点 UUID |

### 5. `get_root_node` — 获取根节点

获取系统发育树的根节点（所有生物的共同祖先）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `embed_primaryImage` | boolean | 否 | 是否嵌入主要图像数据，默认 false |

### 6. `get_image` — 获取图像详情

通过 UUID 获取特定剪影图像的详细信息，包括所有可用文件格式的下载链接。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uuid` | string | 是 | 图像 UUID |
| `embed_contributor` | boolean | 否 | 是否嵌入贡献者数据 |
| `embed_generalNode` | boolean | 否 | 是否嵌入广义分类节点数据 |
| `embed_specificNode` | boolean | 否 | 是否嵌入具体分类节点数据 |
| `embed_nodes` | boolean | 否 | 是否嵌入完整谱系节点 |

### 7. `search_images_by_node` — 按节点搜索图像

列出直接归属于特定节点的所有剪影图像。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `node_uuid` | string | 是 | 节点 UUID |
| `page` | number | 否 | 页码，默认 0 |

### 8. `search_images_by_clade` — 按演化支搜索图像

列出属于某个演化支（节点及其所有后代）的所有剪影图像。适合查找一个大类群的所有图像。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `clade_uuid` | string | 是 | 演化支根节点 UUID |
| `page` | number | 否 | 页码，默认 0 |

### 9. `list_images_by_contributor` — 按贡献者列出图像

列出特定贡献者上传的所有剪影图像。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contributor_uuid` | string | 是 | 贡献者 UUID |
| `page` | number | 否 | 页码，默认 0 |

### 10. `list_contributors` — 列出所有贡献者

列出所有 PhyloPic 贡献者，按图像数量降序排列。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | number | 否 | 页码，默认 0 |

### 11. `get_contributor` — 获取贡献者详情

通过 UUID 获取特定贡献者的详细信息。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uuid` | string | 是 | 贡献者 UUID |

### 12. `list_licenses` — 列出许可证

列出新提交图像可用的所有 Creative Commons 许可证。

（无参数）

### 13. `list_namespaces` — 列出外部命名空间

列出所有可用于解析外部标识符的授权外部分类数据库命名空间。

（无参数）

### 14. `resolve_external_id` — 解析外部标识符

将外部分类数据库的标识符解析为 PhyloPic 系统发育节点。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `authority` | string | 是 | 权威机构（例如 "gbif.org"、"ncbi.nlm.nih.gov"） |
| `namespace` | string | 是 | 命名空间（例如 "species"、"taxid"） |
| `object_id` | string | 是 | 外部标识符（例如 "9443" 对应 NCBI 灵长目） |

### 15. `get_api_info` — 获取 API 信息

获取 PhyloPic API 的常规信息，包括版本号、构建号和可用端点。

（无参数）

### 16. `ping` — 检查 API 状态

检查 PhyloPic API 是否正常运行。

（无参数）

## 使用示例

以下是一些典型的使用场景：

### 场景 1：查找某种生物的剪影图

1. 使用 `autocomplete_taxa` 查询 "dro" → 发现 "drosophila"
2. 使用 `search_taxa` 搜索 "drosophila" → 获取节点 UUID
3. 使用 `search_images_by_node` 传入节点 UUID → 获取图像列表
4. 使用 `get_image` 获取具体图像的下载链接

### 场景 2：查找一个纲的所有图像

1. 使用 `search_taxa` 搜索 "aves"（鸟纲）→ 获取节点 UUID
2. 使用 `search_images_by_clade` 传入节点 UUID → 获取所有鸟类图像

### 场景 3：通过 NCBI 分类 ID 查找

1. 使用 `list_namespaces` 查看可用数据库
2. 使用 `resolve_external_id`，参数为 authority="ncbi.nlm.nih.gov", namespace="taxid", object_id="9443"（灵长目）
3. 使用返回的节点 UUID 进一步查询图像

## 项目结构

```
phylopic-mcp/
├── package.json              # 项目配置和依赖
├── tsconfig.json             # TypeScript 编译配置
├── LICENSE                   # MIT 许可证
├── README.md                 # 英文文档
├── README.zh-CN.md           # 中文文档（本文件）
├── src/
│   ├── index.ts              # 入口文件
│   ├── server.ts             # MCP 服务器定义和工具注册
│   ├── api/
│   │   ├── client.ts         # PhyloPic API 客户端封装
│   │   └── types.ts          # API 类型定义
│   └── tools/
│       └── formatters.ts     # 响应格式化工具
├── dist/                     # 编译输出（自动生成）
└── node_modules/             # 依赖包
```

## 开发

### 构建项目

```bash
npm run build      # 编译 TypeScript
npm run dev        # 以监视模式编译
```

### 运行测试

```bash
npm run inspector   # 使用 MCP Inspector 交互式测试
```

## 技术说明

### PhyloPic API 构建号

PhyloPic API 使用构建号（build number）系统。每次 API 更新都会发布一个新的构建。每个 API 请求都必须在查询字符串中包含当前的构建号；否则会收到 `307 Temporary Redirect` 重定向。

本服务器的 API 客户端自动处理构建号：
1. 首次请求时自动从 API 根端点获取当前构建号
2. 后续请求复用该构建号
3. 如果收到 `410 Gone`（构建号过期），自动重新获取并重试

### 图像文件格式

每张 PhyloPic 图像提供多种文件格式：
- **sourceFile**：原始上传文件
- **vectorFile**：自动生成的 SVG 矢量图（纯黑、透明背景）
- **rasterFiles**：多种尺寸的 PNG 光栅图（从大到小）
- **thumbnailFiles**：正方形缩略图（PNG 格式）
- **social preview**：社交媒体预览图（1200x628）

### 许可证

PhyloPic 上的图像采用 Creative Commons 许可证，包括 CC0（公共领域）、CC-BY、CC-BY-SA 等。每张图像的许可证信息可通过 `get_image` 工具获取。详细信息请参阅 [PhyloPic 图像使用说明](https://www.phylopic.org/articles/image-usage)。

## 许可证

本项目采用 MIT 许可证。

## 致谢

- [PhyloPic](https://www.phylopic.org/) — 由 T. Michael Keesey 创建和维护的开放生物剪影图数据库。本项目是独立的非官方第三方工具，与 PhyloPic 无任何隶属关系。
- [Model Context Protocol](https://modelcontextprotocol.io/) — 由 Anthropic 开发的 AI 上下文协议
- PhyloPic 的所有图像贡献者 — 感谢他们提供免费的剪影图像

## 相关链接

- [PhyloPic 官网](https://www.phylopic.org/)
- [PhyloPic API 文档](https://api-docs.phylopic.org/v2/index.html)
- [PhyloPic API 使用指南](https://www.phylopic.org/articles/api-recipes)
- [PhyloPic GitHub 仓库](https://github.com/keesey/phylopic)
- [MCP 规范](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

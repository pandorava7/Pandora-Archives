---
title: "博客Markdown演示"
date: "2026-01-07"
category: "技术分享"
tags: ["前端"]
cover: "博客markdown演示.png"
summary: "演示这个网站支持的博客markdown功能..."
---

# 🚀 博客功能全演示 (Markdown Test)

> 这是一个用于测试 React 渲染效果的演示文件。它包含了基础排版、GFM 特性、代码高亮以及 HTML 嵌入。

---

## 1. 基础排版与 GFM 插件 (remark-gfm)

### 任务列表
- [x] 搭建 Cloudflare R2 存储
- [x] 实现前端路由跳转
- [ ] 完善评论系统 (待开发)

### 表格支持
| 插件名称件名称件名称       | 类型 | 功能描述 |
| :--- | :--- | :--- |
| remark-gfm | Remark | 支持表格、任务列表、删除线 |
| rehype-highlight | Rehype | 驱动代码块语法高亮 |
| rehype-raw | Rehype | 解析 Markdown 中的原生 HTML |

### 文本修饰
你可以使用 **加粗**，*斜体*，或者是 ~~删除线~~。此外，还可以点击这个[返回首页](/)的内部链接。

### 图片
![描述文本](/src/assets/images/blog_header.png)

---

## 2. 代码高亮 (rehype-highlight)

我们使用 `atom-one-dark` 主题来渲染代码：

```typescript
// 测试代码高亮逻辑
import React from 'react';

const Greeting = ({ name }: { name: string }) => {
  const sayHello = () => {
    console.log(`Hello, ${name}! Welcome to my blog.`);
  };

  return (
    <button onClick={sayHello}>
      点击打招呼
    </button>
  );
};

export default Greeting;
```

## 3. 解析HTML（尽量少用）
<div style="color:red;">这段是红色</div> 
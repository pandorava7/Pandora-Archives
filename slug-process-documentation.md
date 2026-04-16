# Slug 处理逻辑说明

这份文档只描述当前项目里与 slug 本身直接相关的逻辑，供另一个项目的 agent 复刻时参考。

本文刻意排除以下内容：

- 页面级加载流程
- DemoPage 等项目业务逻辑
- 数据库表设计与云同步链路

本文只关注四件事：

- slug 如何从原始标题自动生成
- slug 在生成前后做了哪些筛选、过滤、清洗
- URL 中的 slug / id 组合如何被解析
- 出现异常结果时应该如何排错

## 1. 目标与设计原则

当前实现的目标不是做“英文专用 SEO slug”，而是做一个稳定、可预测、对多语言友好的项目标识字符串。它的核心原则如下：

1. 尽量保留有信息量的字符，而不是强行转拼音或只保留 ASCII。
2. 同一输入在任意时间都应得到相同输出。
3. 先做规范化与清洗，再决定是否截断。
4. 解析 URL 时要容忍旧格式和退化格式。
5. 如果输入完全没有可保留内容，允许得到空 slug，再由上层决定是否回退到 id-only 路径。

## 2. 核心入口

当前 slug 逻辑的核心集中在 `app/projects/projectRoute.ts`，主要入口有四个：

- `PROJECT_SLUG_MAX_LENGTH = 80`
- `slugifyProjectTitle(value, options?)`
- `buildProjectPath({ id, slug, locale })`
- `parseProjectPathParam(projectRef)`

可以把它们理解为两组能力：

- 生成能力：把标题转成 slug，再拼成 canonical path
- 解析能力：把传入路径段拆回 slug / id / 类型

## 3. slug 自动生成的完整流程

### 3.1 最大长度

slug 的最大长度是 80。这个长度不是按 JavaScript 字符串的 UTF-16 单元裁剪，而是按 code point 裁剪：

- `Array.from(value).slice(0, maxLength).join('')`

这意味着 CJK、emoji、组合字符的截断结果会比简单 `slice(0, 80)` 更稳定，不容易把一个可见字符截成半个。

### 3.2 生成顺序不可随意调整

`slugifyProjectTitle` 的处理顺序非常重要。它不是一组可随意交换顺序的 replace，而是一条固定流水线。

当前顺序如下。

#### 第一步：Unicode 规范化

```ts
value.normalize('NFKC')
```

作用：把全角/兼容字符先规整到更统一的形式。例如一些视觉上相同但底层编码不同的字符会先被合并，减少后续规则的不确定性。

#### 第二步：移除不可见字符和控制字符

```ts
/[\p{Cc}\p{Cf}]+/gu
```

会移除：

- 控制字符
- 格式化字符
- 零宽字符
- 某些双向文本控制字符

这一步的目的不是美观，而是避免“看起来一样、实际不同”的 slug。

#### 第三步：整体 trim

```ts
.trim()
```

如果 trim 后已经为空，直接返回空字符串。

#### 第四步：高价值特殊替换

在进入通用替换之前，先处理几个语义上特别重要的技术词：

```ts
.replace(/c\+\+/giu, 'cpp')
.replace(/c#/giu, 'csharp')
.replace(/\.net/giu, 'dotnet')
```

这样做的原因很直接：如果不提前替换，`+`、`#`、`.` 后面都会被当作分隔符或非法字符处理，最终会损失原始语义。

例如：

- `C++ 学习路线` -> `cpp-学习路线`
- `C# 新手指南` -> `csharp-新手指南`
- `.NET 入门` -> `dotnet-入门`

#### 第五步：统一转小写

```ts
.toLocaleLowerCase('en-US')
```

这里显式使用了 `'en-US'`，目的是让大小写折叠保持稳定，而不是依赖运行时环境的默认 locale。

#### 第六步：移除 apostrophe

```ts
/['’`´]+/gu
```

会删除英文撇号及常见变体，而不是把它们替换成 `-`。

例如：

- `John's Tier List` -> `johns-tier-list`

如果这里改成分隔符替换，结果会从 `johns-tier-list` 变成 `john-s-tier-list`，语义会更差。

#### 第七步：统一 dash 变体

```ts
/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]+/gu
```

各种 Unicode dash 会先统一成普通 `-`。

这一步是为了避免：

- 用户视觉上输入的是横线
- 实际编码却不是 ASCII `-`
- 后续比较或路径匹配出现不一致

#### 第八步：统一分隔符

```ts
/[\s_./\\|&+#·•‧・･﹒]+/gu
```

这些字符会被统一替换成 `-`。包括：

- 空白
- 下划线
- 点号
- 正斜杠和反斜杠
- 竖线
- `&`、`+`、`#`
- 常见的中点、项目符号、日文分隔点等

例如：

- `A/B Test 排行` -> `a-b-test-排行`
- `one___two...three` -> `one-two-three`
- `鬼灭の刃・角色强度表` -> `鬼灭の刃-角色强度表`

注意：`+` 和 `#` 虽然也在这里会被替换成 `-`，但前面已经提前拦截了 `c++` 和 `c#` 这两类高价值输入，所以不会误伤那两种技术关键词。

#### 第九步：移除不允许的字符

```ts
/[^\p{L}\p{N}\p{M}-]+/gu
```

最终允许保留的字符只有四类：

- `\p{L}`: 字母
- `\p{N}`: 数字
- `\p{M}`: 组合标记
- `-`: 横线

这意味着：

- 中文、日文、韩文、阿拉伯文会被保留
- emoji 会被移除
- 大多数符号会被移除
- 重音组合字符不会被误删

例如：

- `🔥🔥🔥最强角色🔥` -> `最强角色`
- `أفضل تصنيف أنمي` -> `أفضل-تصنيف-أنمي`
- `최고의 애니 랭킹` -> `최고의-애니-랭킹`

#### 第十步：压缩连续横线

```ts
.replace(/-+/g, '-')
```

这是为了把前面多个替换步骤叠加产生的 `---` 收敛成单个 `-`。

#### 第十一步：去掉首尾横线

```ts
.replace(/^-+|-+$/g, '')
```

避免 slug 以 `-` 开头或结尾。

#### 第十二步：按 code point 截断

```ts
truncateSlug(normalizedSlug, maxLength)
```

截断发生在“所有清洗完成之后”，不是一开始就截断原始标题。

这样做的原因是：

- 最终限制的是 slug 长度，而不是标题长度
- 如果先截断再清洗，结果会更难预测

#### 第十三步：截断后再次清理横线

截断完成后又执行了一轮：

```ts
.replace(/-+/g, '-')
.replace(/^-+|-+$/g, '')
```

这是为了处理一种边界情况：截断刚好切在 `-` 附近，导致末尾或中间状态需要再清理一次。

## 4. 什么字符会被保留，什么会被过滤

可以把保留规则简化为一句话：

只有“字母、数字、组合标记、横线”能进入最终 slug。

### 4.1 会被保留

- 英文字母
- 数字
- 中文
- 日文
- 韩文
- 阿拉伯文
- 已经规范化后的 `-`
- 带组合音标的字符

### 4.2 会被替换为 `-`

- 空格
- `_`
- `.`
- `/`
- `\`
- `|`
- `&`
- `+`
- `#`
- 中点、项目分隔点等变体

### 4.3 会被直接删除

- emoji
- 控制字符
- 不可见格式字符
- apostrophe 及变体
- 绝大多数没有语义价值的符号

## 5. 空 slug 是合法结果

这一点很重要。

当前实现并不保证 `slugifyProjectTitle` 一定返回非空值。如果输入在清洗后没有任何可保留字符，返回值就是空字符串。

例如：

- `!!!` -> ``
- 纯 emoji -> ``
- 纯不可见字符 -> ``

这不是 bug，而是当前设计的一部分。它意味着：

- slug 生成层只负责“尽可能提取可保留内容”
- 是否需要 fallback，例如使用默认 slug、使用 id-only path，应该由上层决定

## 6. canonical slug/path 的拼装规则

`buildProjectPath` 的行为很简单，但它定义了 canonical 输出形式。

输入：

- 必须有合法 UUID `id`
- `slug` 可选
- `locale` 可选

处理规则：

1. `id` 会先被 trim 并转小写。
2. 只有符合 UUID 正则才允许继续，否则直接抛错。
3. `slug` 会再次经过 `slugifyProjectTitle`，而不是信任外部传入值。
4. 如果清洗后的 slug 非空，输出 `slug-id`。
5. 如果清洗后的 slug 为空，输出纯 `id`。
6. 最终整个 `projectRef` 会走 `encodeURIComponent`。

因此 canonical 只有两种：

- `my-favorite-anime-ranking-550e8400-e29b-41d4-a716-446655440000`
- `550e8400-e29b-41d4-a716-446655440000`

不会生成第三种格式。

## 7. 路径解析逻辑

`parseProjectPathParam(projectRef)` 用来把传入的路径段解析成结构化结果：

```ts
type ParsedProjectPathParam = {
	id: string | null;
	slug: string | null;
	rawSlug: string | null;
	kind: 'canonical' | 'id-only' | 'legacy-slug';
};
```

### 7.1 输入预处理

解析前会先经过两个步骤：

1. `decodeURIComponent`，但包了一层 try/catch，避免非法编码直接抛错。
2. trim，并清掉路径段首尾多余的 `/`。

所以解析器对下面这些输入比较宽容：

- 已编码的 slug
- 带前后空格的值
- 错误编码但仍可作为原字符串继续处理的值
- 多余首尾斜杠

### 7.2 分支一：纯 id

如果预处理后的字符串本身就是合法 UUID，则直接返回：

```ts
{
	id,
	slug: null,
	rawSlug: null,
	kind: 'id-only'
}
```

### 7.3 分支二：slug-id 组合

解析器会用以下正则判断是否是 `xxx-uuid` 形式：

```ts
new RegExp(`^(.*)-(${PROJECT_ID_REGEX.source.slice(1, -1)})$`, 'i')
```

如果匹配成功：

- 前半段记作 `rawSlug`
- 后半段记作 `id`
- 再对 `rawSlug` 调一次 `slugifyProjectTitle`

此时有两个结果：

1. 如果 `rawSlug` 清洗后非空，返回 `kind: 'canonical'`
2. 如果 `rawSlug` 清洗后为空，退化成 `kind: 'id-only'`

典型例子：

- `my-project-<uuid>` -> canonical
- `!!!-<uuid>` -> id-only

这就是为什么“带 slug 的输入”最后仍然可能被归类为 `id-only`。

### 7.4 分支三：legacy slug

如果既不是纯 UUID，也不符合 `slug-id` 结构，那么会被当作纯 slug：

```ts
{
	id: null,
	slug: slugifyProjectTitle(normalizedProjectRef) || null,
	rawSlug: normalizedProjectRef,
	kind: 'legacy-slug'
}
```

这里需要注意两点：

1. `rawSlug` 保存的是原始路径段（经过 decode / trim）
2. `slug` 保存的是规范化后的结果，可能是 `null`

也就是说，一个 legacy 输入可能长这样：

- 原始输入：`東京喰種-ランキング`
- `rawSlug`: `東京喰種-ランキング`
- `slug`: `東京喰種-ランキング`

或者：

- 原始输入：`!!!`
- `rawSlug`: `!!!`
- `slug`: `null`

## 8. `rawSlug` 和 `slug` 的区别

很多系统在这里会混淆，这里要特别说明。

### `rawSlug`

表示用户在 URL 里实际传来的那一段文本，在经过安全 decode 和 trim 后保留下来。

用途通常是：

- 做诊断
- 做兼容逻辑
- 在某些场景下回显原始值

### `slug`

表示对 `rawSlug` 再执行一次规范化后得到的结果。

用途通常是：

- 做标准查找键
- 做 canonical 对比
- 做 slug 一致性判断

这两个值不一定相同，也不一定同时存在。

## 9. 典型输入输出样例

以下样例都来自当前实现和现有测试行为。

| 输入 | 输出 slug |
| --- | --- |
| `My Favorite Anime Ranking` | `my-favorite-anime-ranking` |
| `最好的anime 排行！` | `最好的anime-排行` |
| `Fate/Stay Night 角色排行` | `fate-stay-night-角色排行` |
| `鬼灭の刃・角色强度表` | `鬼灭の刃-角色强度表` |
| `C++ 学习路线` | `cpp-学习路线` |
| `C# 新手指南` | `csharp-新手指南` |
| `2026年4月排行榜 v2.0` | `2026年4月排行榜-v2-0` |
| `🔥🔥🔥最强角色🔥` | `最强角色` |
| `東京喰種 ランキング` | `東京喰種-ランキング` |
| `최고의 애니 랭킹` | `최고의-애니-랭킹` |
| `أفضل تصنيف أنمي` | `أفضل-تصنيف-أنمي` |
| `!!!` | 空字符串 |

## 10. 排错逻辑与常见异常

如果另一个项目要复刻这套逻辑，最容易出问题的不是正则本身，而是处理顺序、字符类别和“空 slug 合法”这三个点。

### 10.1 为什么结果是空字符串

先检查输入是否只包含以下内容：

- 标点
- emoji
- 不可见字符
- 控制字符

如果是，那么空字符串是预期结果，不是异常。

### 10.2 为什么 `C++` 没有变成 `c--`

因为 `c++` 和 `c#` 在通用分隔符替换之前就被提前替换了。这是故意保语义，不是 incidental behavior。

### 10.3 为什么多语言字符没有被转拼音

因为当前规则允许 `\p{L}`、`\p{N}`、`\p{M}`。它追求的是“保留原语言字符”，而不是“只输出 ASCII”。

如果另一个系统希望输出 ASCII-only slug，那将是另一套规则，不能称为当前实现的等价复刻。

### 10.4 为什么输入里有横线，结果还是变了

因为不同 Unicode dash 会先统一成 ASCII `-`。视觉相似不代表底层字符相同。

### 10.5 为什么 `!!!-<uuid>` 被解析成 `id-only`

因为前半段 `!!!` 在 slugify 之后为空，所以虽然输入长得像 `slug-id`，最终仍会退化成纯 id。

### 10.6 为什么同一个标题在不同环境不应该生成不同 slug

因为当前实现：

- 显式使用 `normalize('NFKC')`
- 显式使用 `toLocaleLowerCase('en-US')`
- 显式给出了字符类别和替换顺序

如果另一个环境输出不同，优先检查：

1. 是否少做了 Unicode normalization
2. 是否 lower-case 时用了系统默认 locale
3. 是否把替换顺序改了
4. 是否把 `\p{L}\p{N}\p{M}` 改成了 ASCII 白名单

### 10.7 为什么截断后末尾没有 `-`

因为截断后还会再次执行“压缩横线”和“去掉首尾横线”。如果复刻版本出现尾部 `-`，说明最后一轮清理漏掉了。

## 11. 建议的复刻伪代码

```ts
function slugify(input, maxLength = 80) {
	const normalized = input
		.normalize('NFKC')
		.replace(/[\p{Cc}\p{Cf}]+/gu, '')
		.trim();

	if (!normalized) return '';

	const slug = normalized
		.replace(/c\+\+/giu, 'cpp')
		.replace(/c#/giu, 'csharp')
		.replace(/\.net/giu, 'dotnet')
		.toLocaleLowerCase('en-US')
		.replace(/['’`´]+/gu, '')
		.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]+/gu, '-')
		.replace(/[\s_./\\|&+#·•‧・･﹒]+/gu, '-')
		.replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (!slug) return '';

	return Array.from(slug)
		.slice(0, maxLength)
		.join('')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}
```

## 12. 最小复刻清单

如果另一个项目只想复刻“行为”，至少要保证以下几点完全一致：

1. 使用 NFKC 规范化。
2. 先删控制/不可见字符，再 trim。
3. `c++`、`c#`、`.net` 必须在通用分隔符处理前替换。
4. 允许多语言字母保留，不要强制 ASCII-only。
5. 空格、斜杠、下划线、点号、中点等统一折叠成 `-`。
6. emoji 和大多数符号必须被移除。
7. 按 code point 截断到 80，而不是按 UTF-16 长度粗暴截断。
8. 截断后再次清理重复横线和首尾横线。
9. 路径解析时要区分 `canonical`、`id-only`、`legacy-slug` 三类。
10. 允许 `slugify` 返回空字符串，不要在底层强塞默认值。

## 13. 当前测试覆盖了什么

现有测试已经覆盖了以下行为，可把它们视为这套逻辑的最小行为规格：

- 多语言字符保留
- emoji 被移除
- apostrophe 被删除而不是替换成横线
- slash / dot / underscore 等会折叠为横线
- `c++` / `c#` / `.net` 的特殊语义替换
- 长度按 code point 截断
- canonical path 生成
- `slug-id`、`id-only`、`legacy-slug` 三类解析
- `!!!-<uuid>` 会退化为 `id-only`
- 空白输入会返回 `null` 解析结果

## 14. 一句话总结

当前项目的 slug 逻辑本质上是一条“多语言友好、顺序敏感、允许空结果”的规范化流水线；如果另一个项目要得到完全一致的输出，最重要的不是抄正则，而是完整复刻这条流水线的顺序、保留字符范围和退化规则。

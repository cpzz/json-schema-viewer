在 JSON Schema 的最新正式规范 **2020-12**（对应 `$schema`: `https://json-schema.org/draft/2020-12/schema`）中，数组（array）的验证语法相比旧版（如 Draft-07）有了重要变化，最核心的改动是引入了 `prefixItems` 来替代旧的元组验证用法。

以下是最新语法中 array 相关关键字的完整说明：

### 1. 核心关键字一览

| 关键字 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | `"array"` | 声明值为数组类型 |
| `items` | schema | 定义数组中**所有元素**（或 `prefixItems` 之后的剩余元素）必须满足的模式 |
| `prefixItems` | [schema] | 🆕 **2020-12 新增**。按位置定义前 N 个元素的模式（元组验证） |
| `contains` | schema | 数组中**至少一个**元素需满足此模式 |
| `minContains` / `maxContains` | integer | 配合 `contains`，限定匹配元素的数量范围 |
| `uniqueItems` | boolean | 为 `true` 时要求数组元素互不重复 |
| `minItems` / `maxItems` | integer | 限制数组长度 |

### 2. 关键变化：`items` vs `prefixItems`

> ⚠️ **最重要的变更**：在 2020-12 之前，`items` 既可以是单个 schema（验证所有元素），也可以是 schema 数组（元组验证）。**从 2020-12 起，`items` 只能是单个 schema**，元组验证的职责移交给了 `prefixItems`。

#### ✅ 统一元素类型（所有元素相同）
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "string"
  },
  "minItems": 1,
  "maxItems": 10
}
```
→ 验证：`["a", "b", "c"]` ✅ | `[1, "b"]` ❌

#### ✅ 元组验证（按位置指定不同类型）— 使用 `prefixItems`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "prefixItems": [
    { "type": "string" },
    { "type": "integer", "minimum": 0 },
    { "type": "boolean" }
  ],
  "items": false
}
```
- `prefixItems[0]` → 第1个元素必须是 string
- `prefixItems[1]` → 第2个元素必须是 ≥0 的整数
- `prefixItems[2]` → 第3个元素必须是 boolean
- `"items": false` → **禁止**出现第4个及以后的元素（严格固定长度元组）

如果允许额外元素，将 `"items": false` 改为其他 schema 即可：
```json
{
  "prefixItems": [
    { "type": "string" },
    { "type": "number" }
  ],
  "items": { "type": "string" }
}
```
→ 前2个元素按位置校验，第3个起必须是 string。

### 3. `contains` + `minContains` / `maxContains`

```json
{
  "type": "array",
  "contains": { "type": "integer", "minimum": 10 },
  "minContains": 2,
  "maxContains": 5
}
```
→ 数组中必须有 **2~5 个** ≥10 的整数，其余元素不受约束。

> 💡 当 `contains` 存在但无 `minContains` 时，默认 `minContains=1`；若无 `maxContains`，则无上限。

### 4. `uniqueItems`

```json
{
  "type": "array",
  "uniqueItems": true
}
```
→ `[1, 2, 3]` ✅ | `[1, 2, 1]` ❌  
注意：唯一性基于 JSON 值相等比较（对象和数组按内容深度比较）。

### 5. 综合示例

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "coordinates": {
      "type": "array",
      "prefixItems": [
        { "type": "number", "minimum": -180, "maximum": 180 },
        { "type": "number", "minimum": -90, "maximum": 90 }
      ],
      "items": false,
      "description": "固定2元素的 [经度, 纬度] 元组"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "uniqueItems": true,
      "maxItems": 20
    },
    "scores": {
      "type": "array",
      "contains": { "type": "number", "exclusiveMinimum": 0 },
      "minContains": 1
    }
  }
}
```

### 速查对照表（旧版 → 2020-12）

| 旧写法 (Draft-07) | 新写法 (2020-12) |
| :--- | :--- |
| `"items": [s1, s2, s3]` | `"prefixItems": [s1, s2, s3]` |
| `"items": [s1, s2], "additionalItems": s3` | `"prefixItems": [s1, s2], "items": s3` |
| `"items": [s1, s2], "additionalItems": false` | `"prefixItems": [s1, s2], "items": false` |
| `"items": s` （单schema） | `"items": s` （不变） |

> 📌 **提示**：目前许多工具链（如 Ajv v8+、Python jsonschema v4+、.NET System.Text.Json.Schema）已支持 2020-12。如果你仍在使用 Draft-07 或更早版本，`prefixItems` 不可用，需继续使用 `items` 数组形式 + `additionalItems`。建议新项目直接使用 2020-12。

---

## json-schema-viewer 适配说明（本项目约定）

当前项目中的 array 实现按 **JSON Schema 2020-12** 处理，约定如下：

- 仅支持 2020-12 语义，不兼容 Draft-07 的 `items: []` / `additionalItems` 写法。
- 导入解析使用：`prefixItems`（元组）、`items`（尾项 schema 或 `false`）、`contains`。
- 导出时根节点会带：`"$schema": "https://json-schema.org/draft/2020-12/schema"`。
- 校验使用 Ajv 2020（`ajv/dist/2020`）。
- 属性面板支持编辑：`items`、`contains`、`minItems`、`maxItems`、`uniqueItems`、`minContains`、`maxContains`。
- 树编辑器中，array 右键新增子节点会追加到 `prefixItems`。

## 回归用最小样例

### 用例 A：prefixItems + items=false（固定长度元组）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "prefixItems": [
    { "type": "string" },
    { "type": "integer", "minimum": 0 }
  ],
  "items": false
}
```

预期：

- 树上能看到 `prefixItems[0]`、`prefixItems[1]`，且可继续右键给 array 增加前缀项。
- 属性面板中 `items` 显示为 `false（禁止额外项）`。
- 代码面板导出保持 `prefixItems + items:false`。

### 用例 B：contains + minContains/maxContains

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "contains": { "type": "number", "minimum": 10 },
  "minContains": 1,
  "maxContains": 2
}
```

预期：

- 树上出现 `contains` 子节点。
- 属性面板可编辑 `minContains` / `maxContains`，并可关闭 `contains`（关闭后两个字段应清空）。
- 校验不报 draft 版本关键字错误。

### 用例 C：统一尾项 + 长度/唯一性约束

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": { "type": "string", "minLength": 1 },
  "minItems": 0,
  "maxItems": 5,
  "uniqueItems": true
}
```

预期：

- 属性面板可编辑 `minItems` / `maxItems`（支持 `0`）和 `uniqueItems`。
- 导出 JSON 保留 `minItems: 0`，不应被误清空。

## 快速验收步骤

1. 分别导入用例 A/B/C。
2. 在树和属性面板做一次小修改（如改一个类型、切换 `items` 模式、勾选 `uniqueItems`）。
3. 对照代码面板检查关键字是否按 2020-12 语义输出。
4. 点击校验，确认无 `prefixItems` / `contains` 相关关键字报错。
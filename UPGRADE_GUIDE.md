# ConfigMate 升级指南

## 从 v1.1.0 升级到 v1.2.0

### 🚨 重要变更

#### 安全修复
- **移除 lodash 依赖**: 为了修复安全漏洞，我们移除了 `lodash.set`、`lodash.get` 和 `lodash.merge` 依赖
- **新的安全工具函数**: 引入了防止原型污染的安全对象操作函数

#### 类型安全增强
- **泛型支持**: `ConfigManager` 和相关接口现在支持泛型类型
- **更好的类型推断**: 改进了 TypeScript 类型推断和安全性

### 📦 依赖更新

```bash
# 更新依赖
npm install @ldesign/configmate@latest

# 或者使用 yarn
yarn add @ldesign/configmate@latest
```

### 🔄 迁移步骤

#### 1. 更新 TypeScript 类型（可选但推荐）

**之前:**
```typescript
import { createConfig } from '@ldesign/configmate';

const config = await createConfig({
  dir: './config'
});

const port = config.get('server.port'); // any 类型
```

**现在:**
```typescript
import { createConfig } from '@ldesign/configmate';

interface MyConfig {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
  };
}

const config = await createConfig<MyConfig>({
  dir: './config'
});

const port = config.get('server.port'); // 类型安全的 number
```

#### 2. 使用新的安全工具函数（如果直接使用）

如果你之前直接使用了 lodash 函数，现在可以使用我们的安全替代品：

**之前:**
```typescript
import get from 'lodash.get';
import set from 'lodash.set';
import merge from 'lodash.merge';

const value = get(obj, 'path.to.value');
const newObj = set(obj, 'path.to.value', newValue);
const merged = merge(target, source);
```

**现在:**
```typescript
import { getPath, setPath, mergeDeep } from '@ldesign/configmate';

const value = getPath(obj, 'path.to.value');
const newObj = setPath(obj, 'path.to.value', newValue);
const merged = mergeDeep(target, source);
```

### 🆕 新功能

#### 1. 增强的缓存系统

```typescript
import { EnhancedCache } from '@ldesign/configmate';

const cache = new EnhancedCache({
  maxSize: 1000,
  ttl: 300000, // 5 minutes
  maxMemory: 50 * 1024 * 1024, // 50MB
});

// 获取缓存统计
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
console.log(`Memory usage: ${stats.memoryUsage} bytes`);
```

#### 2. 错误恢复机制

```typescript
import { ConfigRecoveryManager } from '@ldesign/configmate';

const recoveryManager = new ConfigRecoveryManager({
  failureThreshold: 3,
  resetTimeout: 30000,
});

const config = await recoveryManager.loadConfigWithRecovery(
  () => loadConfigFromFile(),
  { maxAttempts: 3, delay: 1000 }
);
```

#### 3. 重试和熔断器

```typescript
import { RetryManager, CircuitBreaker } from '@ldesign/configmate';

const retryManager = new RetryManager();
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

// 带重试的操作
const result = await retryManager.execute(
  () => riskyOperation(),
  { maxAttempts: 3, backoffMultiplier: 2 }
);

// 带熔断器的操作
const result = await circuitBreaker.execute(() => externalService());
```

### 🔧 配置选项更新

新增了一些配置选项来支持新功能：

```typescript
const config = await createConfig({
  // 现有选项...
  
  // 新增选项
  errorRecovery: {
    enabled: true,
    maxRetries: 3,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    }
  },
  
  enhancedCache: {
    enabled: true,
    maxMemory: 100 * 1024 * 1024, // 100MB
    onEvict: (key, entry) => {
      console.log(`Evicted cache entry: ${key}`);
    }
  }
});
```

### 🧪 测试更新

如果你有自定义测试，可能需要更新：

```typescript
// 测试类型安全的配置
import { createConfig } from '@ldesign/configmate';

interface TestConfig {
  test: {
    value: string;
  };
}

const config = await createConfig<TestConfig>({
  defaults: { test: { value: 'default' } }
});

// 现在有类型检查
expect(config.get('test.value')).toBe('default');
```

### 📈 性能改进

- **内存使用优化**: 新的缓存系统可以更好地管理内存使用
- **错误恢复**: 减少了因临时错误导致的应用崩溃
- **类型安全**: 编译时类型检查减少运行时错误

### 🔍 故障排除

#### 类型错误

如果遇到 TypeScript 类型错误：

1. 确保你的 TypeScript 版本 >= 4.5
2. 更新你的类型定义
3. 如果使用严格模式，可能需要调整一些类型断言

#### 缓存问题

如果遇到缓存相关问题：

```typescript
// 清除缓存
config.clearCache();

// 获取缓存统计
const stats = config.getCacheStats();
console.log('Cache stats:', stats);
```

#### 错误恢复问题

如果错误恢复不按预期工作：

```typescript
// 检查恢复状态
const recoveryStats = recoveryManager.getStats();
console.log('Recovery stats:', recoveryStats);

// 重置恢复机制
recoveryManager.reset();
```

### 📚 更多资源

- [API 文档](./README.md)
- [新功能详解](./FEATURES.md)
- [示例代码](./examples/)
- [测试用例](./tests/)

### 🤝 获取帮助

如果在升级过程中遇到问题：

1. 查看 [GitHub Issues](https://github.com/ldesign/configmate/issues)
2. 阅读 [FAQ](./FAQ.md)
3. 提交新的 Issue

### 📝 变更日志

查看完整的变更日志：[CHANGELOG.md](./CHANGELOG.md)

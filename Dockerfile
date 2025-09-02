# 使用官方Node.js 18 LTS版本作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括编译工具，用于某些npm包）
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# 复制package文件（优化缓存层）
COPY package*.json ./

# 安装Node.js依赖（使用npm install，兼容没有package-lock.json的情况）
RUN npm install --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/logs /app/uploads && \
    chown -R node:node /app

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 健康检查（优化超时时间）
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# 启动命令
CMD ["node", "app.js"]

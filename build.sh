#!/usr/bin/env bash
#
# 构建博客并使其对 nginx 生效。
#
# 为什么需要这个脚本：
#   blog.lockhart.ren 曾长期返回 403。根因不是权限也不是 nginx 配置，而是站点
#   从未构建成功过 —— source/ 下没有任何内容，public/ 里只有主题静态资源、
#   没有 index.html。nginx 的 root 指向 public/，目录存在但无索引文件即返回 403。
#   Hexo 不会自动构建，必须显式执行；之前没有任何脚本承担这件事。
#
# 用法：
#   cd ~/blog && ./build.sh
#
# 说明：
#   - public/ 是构建产物，已被 .gitignore 忽略，不进入版本库。
#   - 这个站点由 nginx 直接托管静态文件，不经过 pm2，因此无需重启任何进程。
#   - 本脚本比 arknights-recruit/update.sh 简单得多，因为这里没有数据库、
#     没有后端进程、也没有需要原子切换的风险面。
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

log() { printf '\033[1;34m>>>\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m ok\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m  !\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m xx\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. 前置检查
log "检查工作区状态"
if [ -n "$(git status --porcelain)" ]; then
  warn "工作区有未提交的改动："
  git status --porcelain >&2
  warn "构建产物不受影响，但请留意改动是否该提交"
fi

# source/ 为空是「站点其实没内容」的直接信号，必须明确说出来。
SOURCE_COUNT="$(find source -type f 2>/dev/null | wc -l | tr -d ' ')"
if [ "$SOURCE_COUNT" -eq 0 ]; then
  die "source/ 下没有任何文件 —— 构建将产出无内容的站点。请先新建文章：npx hexo new post \"标题\""
fi
ok "source/ 含 $SOURCE_COUNT 个文件"

# ---------------------------------------------------------------- 2. 清理 + 构建
log "清理旧产物"
npx hexo clean >/dev/null 2>&1 || true

log "生成站点"
npx hexo generate

# ---------------------------------------------------------------- 3. 校验
# 这一步是本脚本存在的主要理由：没有它，构建「成功」但产物缺失的情况无人发现。
log "校验产物"
[ -f public/index.html ] || die "构建结束但没有 public/index.html —— nginx 将继续返回 403"
[ -s public/index.html ] || die "public/index.html 是空文件"
ok "public/index.html 存在（$(wc -c < public/index.html) 字节）"

MISSING=0
for page in archives/index.html; do
  if [ ! -f "public/$page" ]; then
    warn "缺少 public/$page"
    MISSING=1
  fi
done
[ "$MISSING" -eq 0 ] && ok "归档页面存在"

# 首页引用的本地资源必须都真实存在，否则站点能打开但样式/脚本 404。
# 这里只校验本地相对路径，跳过 http(s)、协议相对地址与纯锚点。
log "校验首页引用的本地资源"
BROKEN=0
REFS="$(grep -oE '(href|src)="[^"]+"' public/index.html \
        | sed -E 's/^(href|src)="//; s/"$//' \
        | grep -vE '^(https?:)?//' \
        | grep -vE '^#' \
        | grep -vE '^(mailto|data|javascript):' \
        | cut -d'?' -f1 | cut -d'#' -f1 | sort -u)"
for ref in $REFS; do
  case "$ref" in
    /*) target="public$ref" ;;
    *)  target="public/$ref" ;;
  esac
  if [ ! -e "$target" ] && [ ! -e "$target/index.html" ]; then
    warn "首页引用了不存在的资源：$ref"
    BROKEN=$((BROKEN + 1))
  fi
done
if [ "$BROKEN" -eq 0 ]; then
  ok "首页引用的 $(( $(printf '%s\n' "$REFS" | grep -c . ) )) 个本地资源均存在"
else
  warn "有 $BROKEN 个引用指向不存在的资源"
fi

# ---------------------------------------------------------------- 4. 线上验证
log "线上健康检查"
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://blog.lockhart.ren/ || echo 000)"
if [ "$CODE" = "200" ]; then
  ok "https://blog.lockhart.ren/ -> HTTP $CODE"
else
  warn "https://blog.lockhart.ren/ 返回 HTTP $CODE，请确认 nginx root 指向 $PROJECT_ROOT/public"
fi

CSS_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://blog.lockhart.ren/css/style.css || echo 000)"
if [ "$CSS_CODE" = "200" ]; then
  ok "静态资源可访问 -> HTTP $CSS_CODE"
else
  warn "静态资源返回 HTTP $CSS_CODE"
fi

# ---------------------------------------------------------------- 5. 汇总
log "完成"
printf '    站点根目录 : %s/public\n' "$PROJECT_ROOT"
printf '    生成文件数 : %s\n' "$(find public -type f | wc -l | tr -d ' ')"
printf '    顶部文章   : '
git --no-pager log --oneline -1

#!/bin/bash

echo "=============================="
echo "  星盘工坊 (Astrolabe Studio)"
echo "=============================="
echo ""
echo "[1] 安装依赖"
echo "[2] 开发模式"
echo "[3] 构建"
echo "[4] 打包 Windows 应用"
echo "[5] 运行测试"
echo "[6] 退出"
echo ""
read -p "请选择操作: " choice

case $choice in
    1)
        echo ""
        echo "正在安装依赖..."
        pnpm install --ignore-scripts
        echo ""
        echo "依赖安装完成！"
        ;;
    2)
        echo ""
        echo "正在启动开发模式..."
        pnpm dev
        ;;
    3)
        echo ""
        echo "正在构建..."
        pnpm build
        echo ""
        echo "构建完成！"
        ;;
    4)
        echo ""
        echo "正在打包 Windows 应用..."
        pnpm package:win
        echo ""
        echo "打包完成！"
        echo "应用位置: packages/core/release/win-unpacked/星盘工坊.exe"
        ;;
    5)
        echo ""
        echo "正在运行测试..."
        pnpm test
        ;;
    6)
        exit 0
        ;;
    *)
        echo "无效选择"
        ;;
esac

#!/usr/bin/env bash
# scripts/diagnostic.sh
#
# On-device diagnostic script via ADB.
# Run AFTER installing the APK on a connected Android device.
#
# Usage:
#   chmod +x scripts/diagnostic.sh
#   ./scripts/diagnostic.sh
#
# Outputs:
#   - App PSS memory usage
#   - JS heap info
#   - GPU frame timing (FPS estimate)
#   - ANR/crash traces (last 20 lines)

PACKAGE="com.yourcompany.expomusic"  # PLACEHOLDER — match app.config.js

echo "======================================================"
echo " Expo Music Player — Device Diagnostic"
echo " Package: $PACKAGE"
echo "======================================================"
echo ""

# ─── Check device connection ─────────────────────────────────────────────────
if ! adb devices | grep -q "device$"; then
  echo "[ERROR] No ADB device found. Connect your device and enable USB debugging."
  exit 1
fi

echo "[1/4] Memory Usage (PSS)"
echo "------------------------------------------------------"
adb shell dumpsys meminfo "$PACKAGE" | grep -E "(TOTAL|Native Heap|Dalvik Heap|Code|Stack|Graphics|Private)"
echo ""

echo "[2/4] JS Heap (via meminfo JVMTI)"
echo "------------------------------------------------------"
adb shell dumpsys meminfo "$PACKAGE" --local | head -40
echo ""

echo "[3/4] GPU Frame Timing (recent 120 frames)"
echo "------------------------------------------------------"
adb shell dumpsys gfxinfo "$PACKAGE" | grep -A 5 "Profile data"
echo ""
# Calculate approximate FPS from Janky frames
adb shell dumpsys gfxinfo "$PACKAGE" | grep -E "(Janky frames|Total frames)"
echo ""

echo "[4/4] Recent Crashes / ANR"
echo "------------------------------------------------------"
adb shell logcat -d -s "AndroidRuntime" | tail -20
echo ""
adb shell dumpsys activity anr | head -20
echo ""

echo "======================================================"
echo " Diagnostic complete."
echo " Target: TOTAL PSS < 150 MB, Janky frames < 5%"
echo "======================================================"

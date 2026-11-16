#!/usr/bin/env bash
# Rebuild the offline-AI native library from llama.cpp.
#
# This machine (like the phone) is arm64 Linux, so the Android NDK's x86_64 clang
# cannot run here. We cross-compile with the host clang and the NDK sysroot.
#
#   git clone --depth 1 https://github.com/ggml-org/llama.cpp /tmp/opencode/llama.cpp
#   ./scripts/build-llm.sh /tmp/opencode/llama.cpp
#
# Android NDK r27c is only used for its headers/sysroot, never for its binaries.
set -euo pipefail

LLAMA=${1:-/tmp/opencode/llama.cpp}
NDK=${NDK_ROOT:-/tmp/opencode/android-ndk-r27c}
SYS=$NDK/toolchains/llvm/prebuilt/linux-x86_64/sysroot
RES=$NDK/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/18
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$NDK" ]; then
  echo "Missing NDK at $NDK" >&2
  echo "  curl -L -o /tmp/ndk.zip https://dl.google.com/android/repository/android-ndk-r27c-linux.zip" >&2
  exit 1
fi

if [ ! -d "$LLAMA/ggml" ]; then
  echo "Missing llama.cpp at $LLAMA" >&2
  echo "  git clone --depth 1 https://github.com/ggml-org/llama.cpp $LLAMA" >&2
  exit 1
fi

echo "→ configuring llama.cpp for Android arm64"
cat > /tmp/android-arm64.cmake <<EOF
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)
set(NDK_ROOT "$NDK")
set(ANDROID_SYSROOT "${SYS}")
set(CLANG_RESOURCE_DIR "${RES}")
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)
set(BASE_FLAGS "--target=aarch64-unknown-linux-android23 --sysroot=\${ANDROID_SYSROOT} -resource-dir=\${CLANG_RESOURCE_DIR} -fuse-ld=lld -rtlib=compiler-rt -fPIC")
set(CMAKE_C_FLAGS_INIT "\${BASE_FLAGS}")
set(CMAKE_CXX_FLAGS_INIT "\${BASE_FLAGS}")
set(CMAKE_SHARED_LINKER_FLAGS_INIT "\${BASE_FLAGS}")
set(CMAKE_EXE_LINKER_FLAGS_INIT "\${BASE_FLAGS}")
EOF

(cd "$LLAMA" && NDK_ROOT="$NDK" cmake -B build-android -G Ninja \
  -DCMAKE_MAKE_PROGRAM=/usr/bin/ninja \
  -DCMAKE_TOOLCHAIN_FILE=/tmp/android-arm64.cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
  -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_CURL=OFF \
  -DGGML_BUILD_EXAMPLES=OFF -DGGML_OPENMP=OFF -DGGML_NATIVE=OFF)

echo "→ building llama.cpp (static)"
cmake --build "$LLAMA/build-android" -j3 || true   # cpp-httplib (server) fails on purpose; libs are what we need

L=$LLAMA/build-android
[ -f "$L/src/libllama.a" ] || { echo "libllama.a not built" >&2; exit 1; }

echo "→ compiling JNI bridge"
mkdir -p "$ROOT/android/jniLibs/arm64-v8a"
for src in "$ROOT"/android/jni/*.cpp; do
  clang++ --target=aarch64-unknown-linux-android23 --sysroot="$SYS" -resource-dir="$RES" \
    -fuse-ld=lld -rtlib=compiler-rt -std=c++17 -O2 -fPIC -shared -fvisibility=hidden \
    -I"$LLAMA/include" -I"$LLAMA/ggml/include" \
    "$src" -Wl,--start-group \
    "$L/src/libllama.a" "$L/ggml/src/libggml.a" "$L/ggml/src/libggml-base.a" "$L/ggml/src/libggml-cpu.a" "$L/vendor/hash/libvendor-hash.a" \
    -Wl,--end-group -lm -ldl -llog -o "$ROOT/android/jniLibs/arm64-v8a/libyuki_llm.so"
done

cp "$SYS/usr/lib/aarch64-linux-android/libc++_shared.so" "$ROOT/android/jniLibs/arm64-v8a/"

echo "✓ android/jniLibs/arm64-v8a/libyuki_llm.so"

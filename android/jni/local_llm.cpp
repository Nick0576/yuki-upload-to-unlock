// Yuki local AI: llama.cpp JNI bridge (GGUF models, CPU inference).
#include <jni.h>
#include <android/log.h>

#include <atomic>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>

#include "llama.h"

#define TAG "yuki_llm"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)

static JavaVM *g_vm = nullptr;
static jobject g_callback = nullptr;
static jmethodID g_on_token = nullptr;
static jmethodID g_on_end = nullptr;
static std::mutex g_mutex;
static std::atomic<bool> g_abort(false);
static struct llama_model *g_model = nullptr;

static void quiet_log(enum ggml_log_level level, const char *text, void *user_data) {
  (void)level;
  (void)text;
  (void)user_data;
}

extern "C" JNIEXPORT jint JNI_OnLoad(JavaVM *vm, void *reserved) {
  g_vm = vm;
  (void)reserved;
  return JNI_VERSION_1_6;
}

namespace {

JNIEnv *jni() {
  JNIEnv *env = nullptr;
  if (g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) == JNI_OK) return env;
  JavaVMAttachArgs args{JNI_VERSION_1_6, const_cast<char *>("yuki-llm"), nullptr};
  if (g_vm->AttachCurrentThread(&env, &args) != JNI_OK) return nullptr;
  return env;
}

void emit_token(const std::string &id, const char *piece) {
  JNIEnv *env = jni();
  if (!env || !g_callback || !g_on_token) return;
  jstring jid = env->NewStringUTF(id.c_str());
  jstring jtext = env->NewStringUTF(piece);
  env->CallVoidMethod(g_callback, g_on_token, jid, jtext);
  env->DeleteLocalRef(jid);
  env->DeleteLocalRef(jtext);
}

void emit_end(const std::string &id, bool ok, const char *reason) {
  JNIEnv *env = jni();
  if (!env || !g_callback || !g_on_end) return;
  jstring jid = env->NewStringUTF(id.c_str());
  jstring jreason = env->NewStringUTF(reason ? reason : "");
  env->CallVoidMethod(g_callback, g_on_end, jid, ok ? JNI_TRUE : JNI_FALSE, jreason);
  env->DeleteLocalRef(jid);
  env->DeleteLocalRef(jreason);
}

struct ChatMsg {
  std::string role;
  std::string content;
};

std::vector<ChatMsg> parse_history(const std::string &system, const std::string &history) {
  std::vector<ChatMsg> out;
  out.push_back({"system", system});
  size_t start = 0;
  while (start <= history.size()) {
    size_t unit = history.find('\x1f', start);
    std::string item = history.substr(start, unit == std::string::npos ? std::string::npos : unit - start);
    if (!item.empty()) {
      size_t rec = item.find('\x1e');
      if (rec != std::string::npos) {
        out.push_back({item.substr(0, rec), item.substr(rec + 1)});
      }
    }
    if (unit == std::string::npos) break;
    start = unit + 1;
  }
  return out;
}

}  // namespace

extern "C" JNIEXPORT void JNICALL
Java_com_heartverse_yuki_LocalAI_nativeBind(JNIEnv *env, jobject self, jobject callback) {
  jclass cls = env->GetObjectClass(callback);
  g_on_token = env->GetMethodID(cls, "localToken", "(Ljava/lang/String;Ljava/lang/String;)V");
  g_on_end = env->GetMethodID(cls, "localEnd", "(Ljava/lang/String;ZLjava/lang/String;)V");
  if (g_callback) env->DeleteGlobalRef(g_callback);
  g_callback = env->NewGlobalRef(callback);
  LOGI("local AI bridge bound");
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_heartverse_yuki_LocalAI_nativeNew(JNIEnv *env, jobject self, jstring path, jint n_ctx, jint n_threads) {
  (void)self;
  std::lock_guard<std::mutex> lock(g_mutex);
  const char *p = env->GetStringUTFChars(path, nullptr);

  llama_log_set(quiet_log, nullptr);

  llama_model_params mp = llama_model_default_params();
  mp.n_gpu_layers = 0;
  struct llama_model *model = llama_model_load_from_file(p, mp);
  env->ReleaseStringUTFChars(path, p);
  if (!model) {
    LOGI("model load failed");
    return 0;
  }
  g_model = model;

  llama_context_params cp = llama_context_default_params();
  cp.n_ctx = (uint32_t)n_ctx;
  cp.n_batch = 512;
  cp.n_threads = n_threads;
  cp.n_threads_batch = n_threads;
  struct llama_context *ctx = llama_init_from_model(model, cp);
  if (!ctx) {
    LOGI("context creation failed");
    llama_model_free(model);
    return 0;
  }

  LOGI("model loaded, n_ctx=%d threads=%d", n_ctx, n_threads);
  return reinterpret_cast<jlong>(ctx);
}

extern "C" JNIEXPORT void JNICALL
Java_com_heartverse_yuki_LocalAI_nativeFree(JNIEnv *env, jobject self, jlong handle) {
  (void)env;
  (void)self;
  std::lock_guard<std::mutex> lock(g_mutex);
  auto *ctx = reinterpret_cast<struct llama_context *>(handle);
  if (!ctx) return;
  llama_free(ctx);
  if (g_model) {
    llama_model_free(g_model);
    g_model = nullptr;
  }
  LOGI("model + context freed");
}

extern "C" JNIEXPORT void JNICALL
Java_com_heartverse_yuki_LocalAI_nativeGenerate(JNIEnv *env, jobject self, jlong handle,
                                                jstring gen_id, jstring prompt, jint max_tokens, jfloat temp,
                                                jfloat top_p, jfloat top_k) {
  (void)self;
  auto *ctx = reinterpret_cast<struct llama_context *>(handle);
  if (!ctx) return;

  const char *c_id = env->GetStringUTFChars(gen_id, nullptr);
  std::string id_str(c_id);
  env->ReleaseStringUTFChars(gen_id, c_id);

  const char *c_prompt = env->GetStringUTFChars(prompt, nullptr);
  std::string text(c_prompt);
  env->ReleaseStringUTFChars(prompt, c_prompt);

  std::lock_guard<std::mutex> lock(g_mutex);

  struct llama_vocab *vocab = const_cast<struct llama_vocab *>(llama_model_get_vocab(llama_get_model(ctx)));
  llama_memory_t mem = llama_get_memory(ctx);
  llama_memory_clear(mem, true);

  const int n_ctx = llama_n_ctx(ctx);
  const int budget = n_ctx - max_tokens - 16;
  std::vector<llama_token> tokens;
  tokens.resize(llama_vocab_n_tokens(vocab));
  int n = llama_tokenize(vocab, text.c_str(), (int)text.size(), tokens.data(), (int)tokens.size(), false, false);
  if (n < 0) {
    LOGI("tokenize failed");
    emit_end(id_str, false, "tokenize");
    return;
  }
  tokens.resize(n);
  if (n > budget && budget > 0) {
    tokens.erase(tokens.begin(), tokens.begin() + (n - budget));
    n = budget;
  }

  auto sparams = llama_sampler_chain_default_params();
  struct llama_sampler *chain = llama_sampler_chain_init(sparams);
  llama_sampler_chain_add(chain, llama_sampler_init_top_k((int)top_k));
  llama_sampler_chain_add(chain, llama_sampler_init_top_p(top_p, 1));
  llama_sampler_chain_add(chain, llama_sampler_init_temp(temp));
  llama_sampler_chain_add(chain, llama_sampler_init_dist(0));

  g_abort = false;
  const std::string &id = id_str;
  const llama_token eos = llama_vocab_eos(vocab);

  std::string buffer;
  std::vector<llama_token> piece;

  for (int i = 0; i < n; i += 512) {
    int count = std::min(512, n - i);
    struct llama_batch batch = llama_batch_get_one(tokens.data() + i, count);
    if (llama_decode(ctx, batch) != 0) {
      LOGI("decode failed");
      llama_sampler_free(chain);
      emit_end(id, false, "decode");
      return;
    }
  }

  char piece_buf[512];
  int emitted = 0;
  for (int step = 0; step < max_tokens; step++) {
    if (g_abort) {
      llama_sampler_free(chain);
      emit_end(id, true, "stopped");
      return;
    }

    llama_token id_tok = llama_sampler_sample(chain, ctx, -1);
    llama_sampler_accept(chain, id_tok);

    if (id_tok == eos) break;

    int len = llama_token_to_piece(vocab, id_tok, piece_buf, sizeof(piece_buf), 0, false);
    if (len > 0) {
      buffer.append(piece_buf, len);
      piece.push_back(id_tok);
    }

    // Emit a few tokens at a time so the UI streams without churning.
    if (piece.size() >= 3 || (len > 0 && strchr(piece_buf, ' ') != nullptr)) {
      emit_token(id, buffer.c_str());
      buffer.clear();
      emitted = 0;
    } else {
      emitted++;
    }

    struct llama_batch one = llama_batch_get_one(&id_tok, 1);
    if (llama_decode(ctx, one) != 0) break;
  }

  if (!buffer.empty()) emit_token(id, buffer.c_str());
  llama_sampler_free(chain);
  emit_end(id, true, "done");
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_heartverse_yuki_LocalAI_nativePrompt(JNIEnv *env, jobject self, jlong handle,
                                              jstring system, jstring history) {
  (void)self;
  auto *ctx = reinterpret_cast<struct llama_context *>(handle);
  if (!ctx) return env->NewStringUTF("");

  const char *c_system = env->GetStringUTFChars(system, nullptr);
  const char *c_history = env->GetStringUTFChars(history, nullptr);
  std::string sys(c_system);
  std::string hist(c_history);
  env->ReleaseStringUTFChars(system, c_system);
  env->ReleaseStringUTFChars(history, c_history);

  const struct llama_model *model = llama_get_model(ctx);
  const char *tmpl = llama_model_chat_template(model, nullptr);

  std::vector<ChatMsg> msgs = parse_history(sys, hist);
  std::vector<struct llama_chat_message> chat;
  chat.reserve(msgs.size());
  for (auto &m : msgs) {
    struct llama_chat_message cm;
    cm.role = m.role.c_str();
    cm.content = m.content.c_str();
    chat.push_back(cm);
  }

  if (!tmpl) return env->NewStringUTF("");

  size_t need = 256;
  for (auto &m : msgs) need += m.content.size() + 64;
  std::string out;
  out.resize(need);
  int written = llama_chat_apply_template(tmpl, chat.data(), chat.size(), true, &out[0], (int)out.size());
  if (written < 0) return env->NewStringUTF("");
  if ((size_t)written > out.size()) {
    out.resize(written);
    written = llama_chat_apply_template(tmpl, chat.data(), chat.size(), true, &out[0], written);
    if (written < 0) return env->NewStringUTF("");
  }
  out.resize(written);
  return env->NewStringUTF(out.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_heartverse_yuki_LocalAI_nativeCancel(JNIEnv *env, jobject self, jlong handle) {
  (void)env;
  (void)self;
  (void)handle;
  g_abort = true;
}

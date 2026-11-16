import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CloudUpload,
  FileImage,
  FileText,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import yukiIcon from "@/assets/yuki-icon.png.asset.json";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { canUnlockYukiDownload, canUploadYukiFile } from "@/lib/yuki-access";

const DOWNLOAD_URL = "https://u.pcloud.link/publink/show?code=XZE7rfJZ5yXpq5zCBNziuJmyrqGj0jJ2wqq7";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yuki — Private download access" },
      {
        name: "description",
        content:
          "Confirm you’re 18 or older, upload a file privately, and unlock Yuki’s download link.",
      },
      { property: "og:title", content: "Yuki — Private download access" },
      {
        property: "og:description",
        content: "An 18+ private file upload to unlock Yuki’s download.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: YukiPage,
});

function YukiPage() {
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [ageDenied, setAgeDenied] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshLatestUpload = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("file_unlocks")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!queryError) setUploaded(Boolean(data));
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      const currentUser = authError ? null : data.user;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) await refreshLatestUpload();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        window.setTimeout(() => void refreshLatestUpload(), 0);
      } else {
        setUploaded(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshLatestUpload]);

  const chooseFile = (candidate?: File) => {
    setError("");
    setMessage("");
    if (!candidate) return;
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("This file is larger than 50 MB. Choose a smaller file.");
      return;
    }
    setFile(candidate);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.currentTarget.files?.[0]);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!file) {
      setError("Choose a file before continuing.");
      return;
    }
    if (!canUploadYukiFile(isAdultConfirmed, Boolean(user))) {
      setError("Confirm you’re 18 or older and sign in before uploading.");
      return;
    }

    setIsUploading(true);
    let savedPath: string | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError("Your sign-in has expired. Sign in again to upload.");
        return;
      }

      const safeName = file.name.replace(/[\\/]/g, "-").replace(/[^\p{L}\p{N}._ -]/gu, "_");
      savedPath = `${authData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage
        .from("user-uploads")
        .upload(savedPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (storageError) {
        setError("We couldn’t save that file. Please try again.");
        return;
      }

      const { error: recordError } = await supabase.from("file_unlocks").insert({
        user_id: authData.user.id,
        file_path: savedPath,
      });

      if (recordError) {
        await supabase.storage.from("user-uploads").remove([savedPath]);
        setError("The upload couldn’t be confirmed. Please try again.");
        return;
      }

      setUploaded(true);
      setMessage("Upload complete. Your Yuki download is unlocked.");
    } catch {
      if (savedPath) await supabase.storage.from("user-uploads").remove([savedPath]);
      setError("Something went wrong while uploading. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const submitEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    setIsSigningIn(true);
    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError("We couldn’t create your account. Check your details and try again.");
        } else if (data.session) {
          setUser(data.user);
          await refreshLatestUpload();
          setMessage("You’re all set. Choose a file to get started.");
        } else {
          setMessage("Check your email to finish creating your account, then come back to Yuki.");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError || !data.user) {
          setError("We couldn’t sign you in. Check your details and try again.");
        } else {
          setUser(data.user);
          await refreshLatestUpload();
          setMessage("Welcome back. Choose a file or open your unlocked download.");
        }
      }
    } catch {
      setError("We couldn’t complete that request. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "lovable") => {
    setError("");
    setIsCreatingAccount(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) setError("We couldn’t open sign-in. Please try again.");
    } catch {
      setError("We couldn’t open sign-in. Please try again.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const hasDownloadAccess = canUnlockYukiDownload(isAdultConfirmed, Boolean(user), uploaded);

  const openDownload = () => {
    if (!hasDownloadAccess) return;
    window.open(DOWNLOAD_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="yuki-page">
      <div className="yuki-shell">
        <header className="yuki-header">
          <a className="yuki-brand" href="/" aria-label="Yuki home">
            <img src={yukiIcon.url} alt="" className="yuki-brand-image" />
            <span>Yuki</span>
          </a>
          <div className="yuki-header-note">
            <LockKeyhole aria-hidden="true" size={15} /> Private access
          </div>
        </header>

        {!isAdultConfirmed ? (
          <section className="yuki-age-screen" aria-labelledby="age-title">
            <div className="yuki-age-art">
              <img src={yukiIcon.url} alt="Yuki’s anime-inspired character icon" />
              <div className="yuki-art-caption">
                <Sparkles aria-hidden="true" size={15} /> A little space for Yuki
              </div>
            </div>
            <div className="yuki-age-copy">
              <div className="yuki-eyebrow">A PRIVATE DOWNLOAD GATE</div>
              <h1 id="age-title">Yuki</h1>
              {ageDenied ? (
                <>
                  <h2>This page is for adults.</h2>
                  <p>You need to be 18 or older to continue.</p>
                </>
              ) : (
                <>
                  <h2>Before you come in…</h2>
                  <p>Yuki is for adults 18 and over. Please confirm your age to continue.</p>
                  <p className="yuki-attestation-note">
                    This is an age self-confirmation, not an identity check.
                  </p>
                  <Button className="yuki-primary-button" onClick={() => setIsAdultConfirmed(true)}>
                    I’m 18 or older <ArrowUpRight aria-hidden="true" size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="yuki-underage-button"
                    onClick={() => setAgeDenied(true)}
                  >
                    I’m under 18
                  </Button>
                </>
              )}
              <div className="yuki-privacy-line">
                <ShieldCheck aria-hidden="true" size={16} /> Your files stay private to your
                account.
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="yuki-intro" aria-labelledby="welcome-title">
              <div className="yuki-eyebrow">
                A PRIVATE DOWNLOAD GATE <span>·</span> 18+
              </div>
              <h1 id="welcome-title">
                A little closer to <em>Yuki.</em>
              </h1>
              <p>
                Upload a file to unlock the download. Your upload stays private to your account.
              </p>
            </section>

            <section className="yuki-workspace" aria-label="Upload and download">
              <div className="yuki-step-heading">
                <span className="yuki-step-number">01</span>
                <div>
                  <h2>Upload your file</h2>
                  <p>Choose one file from your device · Up to 50 MB</p>
                </div>
              </div>

              {!user && !authLoading ? (
                <section className="yuki-signin" aria-labelledby="signin-heading">
                  <div className="yuki-signin-heading">
                    <LockKeyhole aria-hidden="true" size={19} />
                    <div>
                      <h3 id="signin-heading">Your private space</h3>
                      <p>Sign in to attach uploads to your account.</p>
                    </div>
                  </div>
                  <form className="yuki-auth-form" onSubmit={submitEmailAuth}>
                    <label htmlFor="yuki-email">Email</label>
                    <input
                      id="yuki-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    <label htmlFor="yuki-password">Password</label>
                    <input
                      id="yuki-password"
                      type="password"
                      autoComplete={isRegistering ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <Button
                      type="submit"
                      className="yuki-primary-button yuki-auth-submit"
                      disabled={isSigningIn}
                    >
                      {isSigningIn ? (
                        <LoaderCircle className="yuki-spin" aria-hidden="true" size={17} />
                      ) : null}
                      {isRegistering ? "Create account" : "Sign in"}
                    </Button>
                  </form>
                  <div className="yuki-auth-divider">
                    <span />
                    or continue with
                    <span />
                  </div>
                  <div className="yuki-provider-buttons">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void signInWithProvider("google")}
                      disabled={isCreatingAccount}
                    >
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void signInWithProvider("lovable")}
                      disabled={isCreatingAccount}
                    >
                      Lovable
                    </Button>
                  </div>
                  <p className="yuki-auth-switch">
                    {isRegistering ? "Already have an account?" : "New to Yuki?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering((current) => !current);
                        setError("");
                        setMessage("");
                      }}
                    >
                      {isRegistering ? "Sign in" : "Create an account"}
                    </button>
                  </p>
                  <div className="yuki-download-row" aria-label="Download is locked">
                    <div className="yuki-download-icon">
                      <ArrowDownToLine aria-hidden="true" size={19} />
                    </div>
                    <div className="yuki-download-copy">
                      <h3>Download File</h3>
                      <p>Sign in and upload a file to unlock the download.</p>
                    </div>
                    <Button type="button" className="yuki-download-button" disabled>
                      <LockKeyhole aria-hidden="true" size={15} />
                      <span>Locked</span>
                    </Button>
                  </div>
                </section>
              ) : authLoading ? (
                <div className="yuki-auth-loading" role="status">
                  <LoaderCircle className="yuki-spin" aria-hidden="true" size={18} /> Checking your
                  private space…
                </div>
              ) : (
                <>
                  <label
                    className={`yuki-dropzone${isDragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                  >
                    <input
                      ref={inputRef}
                      className="yuki-file-input"
                      type="file"
                      onChange={onFileChange}
                      aria-describedby="file-help"
                    />
                    {file ? (
                      <FileImage className="yuki-drop-icon" aria-hidden="true" size={25} />
                    ) : (
                      <CloudUpload className="yuki-drop-icon" aria-hidden="true" size={25} />
                    )}
                    <span className="yuki-drop-title">
                      {file ? file.name : "Drop a file here, or browse"}
                    </span>
                    <span id="file-help" className="yuki-drop-subtitle">
                      {file
                        ? `${formatSize(file.size)} · Ready to upload`
                        : "Images, documents, and more · Up to 50 MB"}
                    </span>
                    {file ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.preventDefault();
                          inputRef.current?.click();
                        }}
                      >
                        Choose another
                      </Button>
                    ) : null}
                  </label>

                  <form onSubmit={submitUpload} className="yuki-upload-actions">
                    <Button
                      type="submit"
                      className="yuki-primary-button"
                      disabled={!file || isUploading}
                    >
                      {isUploading ? (
                        <LoaderCircle className="yuki-spin" aria-hidden="true" size={17} />
                      ) : (
                        <CloudUpload aria-hidden="true" size={17} />
                      )}
                      {isUploading ? "Uploading…" : "Submit"}
                    </Button>
                    {uploaded ? (
                      <span className="yuki-uploaded-status">
                        <Check aria-hidden="true" size={16} /> File uploaded
                      </span>
                    ) : null}
                  </form>

                  <div className={`yuki-download-row${hasDownloadAccess ? " is-unlocked" : ""}`}>
                    <div className="yuki-download-icon">
                      <ArrowDownToLine aria-hidden="true" size={19} />
                    </div>
                    <div className="yuki-download-copy">
                      <h3>{hasDownloadAccess ? "Your Yuki download is ready" : "Download File"}</h3>
                      <p>
                        {hasDownloadAccess
                          ? "Your upload is complete. Continue to Yuki on pCloud."
                          : "Upload a file to unlock the download."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="yuki-download-button"
                      disabled={!hasDownloadAccess}
                      onClick={openDownload}
                    >
                      {hasDownloadAccess ? (
                        "Download File"
                      ) : (
                        <>
                          <LockKeyhole aria-hidden="true" size={15} />
                          <span>Locked</span>
                        </>
                      )}
                      {hasDownloadAccess ? <ArrowUpRight aria-hidden="true" size={16} /> : null}
                    </Button>
                  </div>
                </>
              )}

              <div className="yuki-status-messages" aria-live="polite">
                {error ? (
                  <p className="yuki-message yuki-message-error">
                    <X aria-hidden="true" size={16} /> {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="yuki-message yuki-message-success">
                    <Check aria-hidden="true" size={16} /> {message}
                  </p>
                ) : null}
              </div>
              <div className="yuki-account-footer">
                <div>
                  <ShieldCheck aria-hidden="true" size={16} /> Uploads are private and only visible
                  to your account.
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUploaded(false);
                      setFile(null);
                      setMessage("You’re signed out.");
                    }}
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </section>
          </>
        )}

        <footer className="yuki-footer">
          <span>
            Yuki <span aria-hidden="true">·</span> Adults 18+
          </span>
          <span>Files stay yours.</span>
        </footer>
      </div>
    </main>
  );
}

function formatSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

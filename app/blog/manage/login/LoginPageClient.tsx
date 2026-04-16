'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from '../ManagePage.module.css';

type LoginPageClientProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

function getNextPath(nextValue: string | string[] | undefined) {
  const value = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  return value && value.startsWith('/') ? value : '/blog/manage';
}

export default function LoginPageClient({ searchParams }: LoginPageClientProps) {
  const router = useRouter();
  const resolvedSearchParams = use(searchParams);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = getNextPath(resolvedSearchParams.next);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || '登录失败。');
      }

      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '登录失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.loginShell}>
      <div className={styles.loginBackdrop} />
      <div className={styles.loginCard}>
        <p className={styles.loginEyebrow}>Pandora Archives</p>
        <h1 className="brand-gradient-text">博客后台登录</h1>
        <p className={styles.loginDescription}>输入管理密码以进入文章编辑与发布界面。</p>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <label className={styles.fieldLabel} htmlFor="admin-password">
            管理密码
          </label>
          <input
            id="admin-password"
            type="password"
            className={styles.textInput}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入后台密码"
          />

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <button type="submit" className={styles.primaryButton} disabled={submitting || !password.trim()}>
            {submitting ? '登录中...' : '进入后台'}
          </button>
        </form>
      </div>
    </div>
  );
}

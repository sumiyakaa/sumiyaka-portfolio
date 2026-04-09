"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ContactForm.module.css";

const BUDGET_OPTIONS = [
  "〜10万円",
  "10万円〜20万円",
  "20万円〜30万円",
  "30万円〜50万円",
  "50万円〜",
  "未定・相談したい",
] as const;

const DEADLINE_OPTIONS = [
  "1ヶ月以内",
  "1〜2ヶ月",
  "2〜3ヶ月",
  "3ヶ月以上",
  "未定・相談したい",
] as const;

interface FormData {
  name: string;
  email: string;
  budget: string;
  deadline: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

type Status = "idle" | "sending" | "success" | "error";

const transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

function validateField(field: keyof FormData, value: string): string | undefined {
  switch (field) {
    case "name":
      if (!value.trim()) return "氏名を入力してください";
      if (value.length > 100) return "100文字以内で入力してください";
      return undefined;
    case "email":
      if (!value.trim()) return "メールアドレスを入力してください";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "正しいメールアドレスを入力してください";
      return undefined;
    case "message":
      if (!value.trim()) return "お問い合わせ内容を入力してください";
      if (value.length > 5000) return "5000文字以内で入力してください";
      return undefined;
    default:
      return undefined;
  }
}

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    budget: "",
    deadline: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      const errKey = field as keyof FormErrors;
      if (errKey in errors && errors[errKey]) {
        setErrors((prev) => ({ ...prev, [errKey]: undefined }));
      }
    },
    [errors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const newErrors: FormErrors = {};
    const requiredFields: (keyof FormErrors)[] = ["name", "email", "message"];
    requiredFields.forEach((field) => {
      const err = validateField(field, form[field]);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "送信に失敗しました");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setServerError("通信エラーが発生しました。時間をおいて再度お試しください。");
      setStatus("error");
    }
  };

  return (
    <div className={styles.wrapper}>
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            className={styles.successState}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            <h3 className={styles.successTitle}>THANK YOU.</h3>
            <p className={styles.successText}>
              お問い合わせを受け付けました。<br />
              2営業日以内にご返信いたします。
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className={styles.form}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={transition}
            noValidate
          >
            {/* NAME */}
            <div className={styles.field}>
              <label htmlFor="contact-name" className={styles.label}>
                NAME <span className={styles.labelSep}>—</span> <span className={styles.labelJp}>氏名</span>
                <span className={styles.required}>*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                className={styles.input}
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="お名前をご記入ください"
                autoComplete="name"
                required
                disabled={status === "sending"}
              />
              <span className={styles.error} aria-live="polite">{errors.name ?? ""}</span>
            </div>

            {/* EMAIL */}
            <div className={styles.field}>
              <label htmlFor="contact-email" className={styles.label}>
                EMAIL <span className={styles.labelSep}>—</span> <span className={styles.labelJp}>メールアドレス</span>
                <span className={styles.required}>*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                className={styles.input}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                required
                disabled={status === "sending"}
              />
              <span className={styles.error} aria-live="polite">{errors.email ?? ""}</span>
            </div>

            {/* BUDGET */}
            <div className={styles.field}>
              <label htmlFor="contact-budget" className={styles.label}>
                BUDGET <span className={styles.labelSep}>—</span> <span className={styles.labelJp}>ご予算</span>
              </label>
              <div className={styles.selectWrap}>
                <select
                  id="contact-budget"
                  className={styles.select}
                  value={form.budget}
                  onChange={(e) => handleChange("budget", e.target.value)}
                  disabled={status === "sending"}
                >
                  <option value="" disabled>選択してください</option>
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DEADLINE */}
            <div className={styles.field}>
              <label htmlFor="contact-deadline" className={styles.label}>
                DEADLINE <span className={styles.labelSep}>—</span> <span className={styles.labelJp}>ご希望納期</span>
              </label>
              <div className={styles.selectWrap}>
                <select
                  id="contact-deadline"
                  className={styles.select}
                  value={form.deadline}
                  onChange={(e) => handleChange("deadline", e.target.value)}
                  disabled={status === "sending"}
                >
                  <option value="" disabled>選択してください</option>
                  {DEADLINE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* MESSAGE */}
            <div className={styles.field}>
              <label htmlFor="contact-message" className={styles.label}>
                MESSAGE <span className={styles.labelSep}>—</span> <span className={styles.labelJp}>ご相談内容</span>
                <span className={styles.required}>*</span>
              </label>
              <textarea
                id="contact-message"
                className={styles.textarea}
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="ご相談内容をご記入ください"
                rows={6}
                required
                disabled={status === "sending"}
              />
              <span className={styles.error} aria-live="polite">{errors.message ?? ""}</span>
            </div>

            {/* Server Error */}
            <AnimatePresence>
              {status === "error" && serverError && (
                <motion.div
                  className={styles.serverError}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {serverError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submit}
              disabled={status === "sending"}
            >
              {status === "sending" ? (
                <span className={styles.spinner} />
              ) : (
                "SEND →"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

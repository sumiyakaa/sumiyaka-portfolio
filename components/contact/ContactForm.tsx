"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ContactForm.module.css";

const CONTACT_TYPES = [
  "LP制作の相談",
  "WordPress構築の相談",
  "コーディングの相談",
  "その他",
] as const;

interface FormData {
  name: string;
  email: string;
  type: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  type?: string;
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
    case "type":
      if (!value) return "お問い合わせ種別を選択してください";
      return undefined;
    case "message":
      if (!value.trim()) return "お問い合わせ内容を入力してください";
      if (value.length > 5000) return "5000文字以内で入力してください";
      return undefined;
  }
}

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    type: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  const handleChange = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const newErrors: FormErrors = {};
    (Object.keys(form) as (keyof FormData)[]).forEach((field) => {
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
            <span className={styles.successIcon}>&#10003;</span>
            <h3 className={styles.successTitle}>送信完了</h3>
            <p className={styles.successText}>
              お問い合わせいただきありがとうございます。
              <br />
              内容を確認のうえ、折り返しご連絡いたします。
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
            {/* Name */}
            <div className={styles.field}>
              <label htmlFor="contact-name" className={styles.label}>
                氏名<span className={styles.required}>*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="山田 太郎"
                autoComplete="name"
                disabled={status === "sending"}
              />
              {errors.name && <span className={styles.error}>{errors.name}</span>}
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="contact-email" className={styles.label}>
                メールアドレス<span className={styles.required}>*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="example@mail.com"
                autoComplete="email"
                disabled={status === "sending"}
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            {/* Type */}
            <div className={styles.field}>
              <label htmlFor="contact-type" className={styles.label}>
                お問い合わせ種別<span className={styles.required}>*</span>
              </label>
              <select
                id="contact-type"
                className={`${styles.select} ${errors.type ? styles.inputError : ""}`}
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                disabled={status === "sending"}
              >
                <option value="">選択してください</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.type && <span className={styles.error}>{errors.type}</span>}
            </div>

            {/* Message */}
            <div className={styles.field}>
              <label htmlFor="contact-message" className={styles.label}>
                お問い合わせ内容<span className={styles.required}>*</span>
              </label>
              <textarea
                id="contact-message"
                className={`${styles.textarea} ${errors.message ? styles.inputError : ""}`}
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="ご相談内容をお聞かせください"
                rows={8}
                disabled={status === "sending"}
              />
              {errors.message && (
                <span className={styles.error}>{errors.message}</span>
              )}
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
                "SEND MESSAGE"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

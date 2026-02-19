function InlineMessage({ type = "info", text }) {
  if (!text) {
    return null;
  }
  const className = type === "error" ? "msg error" : type === "success" ? "msg success" : "msg";
  return (
    <p className={className} role={type === "error" ? "alert" : "status"} aria-live="polite">
      {text}
    </p>
  );
}

export { InlineMessage };

